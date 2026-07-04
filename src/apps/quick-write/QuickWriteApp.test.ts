import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { RuntimePorts } from '../../core/runtime';
import { EDITOR_CONFIG } from '../../config/editor';
import {
  createRecoveryDraftManager,
  type RecoveryDraftIndexFile,
  type RecoveryDraftJsonValue,
  type RecoveryDraftStoragePorts,
} from '../../core/session';
import { MarkdownService, type EditorJSON } from '../../core/editor';
import { useSettingsStore } from '../../domains/settings/state/settingsStore';
import { QuickWriteApp } from './QuickWriteApp';
import {
  QUICK_WRITE_NATIVE_MENU_EVENT,
  resolveQuickWriteNativeMenuCommand,
} from './quickWriteNativeMenu';
import { createQuickWriteRuntimeAdapter } from './quickWriteRuntime';
import { getQuickWriteTemplateById } from './quickWriteTemplates';

const tauriEventListeners = vi.hoisted(
  () => new Map<string, (event: { payload?: { id?: string } }) => void>(),
);
const closeWindowMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(
    async (
      eventName: string,
      handler: (event: { payload?: { id?: string } }) => void,
    ) => {
      tauriEventListeners.set(eventName, handler);
      return () => {
        if (tauriEventListeners.get(eventName) === handler) {
          tauriEventListeners.delete(eventName);
        }
      };
    },
  ),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    close: closeWindowMock,
    minimize: vi.fn(() => Promise.resolve()),
    toggleMaximize: vi.fn(() => Promise.resolve()),
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
    onFocusChanged: vi.fn(() => Promise.resolve(() => {})),
  }),
}));

function renderQuickWriteApp(
  runtime = createQuickWriteRuntimeAdapter({
    manager: createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createMemoryPorts(),
      createDraftId: () => 'new-draft',
    }),
  }),
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(QuickWriteApp, { runtime }));
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

describe('QuickWriteApp', () => {
  beforeEach(() => {
    installEditorLayoutPolyfills();
    tauriEventListeners.clear();
    closeWindowMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const settings = useSettingsStore.getState();
    settings.setThemePreference('system');
    settings.setEditorFontSize('default');
    settings.setLocalePreference('system');
    document.documentElement.lang = 'en';
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/');
  });

  it('restores the latest active recovery draft on startup', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [draft('older', 1), draft('latest', 3)],
    });
    ports.files.set('/app/recovery/drafts/older.md', 'old body');
    ports.files.set('/app/recovery/drafts/latest.md', 'latest body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    const status = container.querySelector(
      '[aria-label="QuickWrite document status"]',
    );
    const editor = getEditor(container);

    expect(container.textContent).toContain('Draft');
    expect(status?.textContent).toBe('Open');
    expect(editor.value).toBe('latest body');

    await cleanup(container, root);
  });

  it('restores startup recovery editor selection and scroll metadata', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        {
          ...draft('with-editor-state', 3),
          editorState: {
            selection: { anchor: 1, head: 4, updatedAt: 2 },
            scrollTop: 42,
          },
        },
      ],
    });
    ports.files.set('/app/recovery/drafts/with-editor-state.md', 'latest body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    await waitForEditorRestore(container, { scrollTop: '42' });
    const editor = getEditor(container);

    expect(editor.getAttribute('data-restored-selection')).toMatch(/^1:\d+$/);
    expect(editor.getAttribute('data-restored-scroll-top')).toBe('42');
    expect(editor.scrollTop).toBe(42);

    await cleanup(container, root);
  });

  it('restores recovery editor metadata after Markdown parse fallback loads plain text', async () => {
    const originalParse = MarkdownService.parse;
    vi.spyOn(MarkdownService, 'parse').mockImplementation((markdown) => {
      if (markdown === 'plain fallback body') {
        return Promise.reject(new Error('parse failed'));
      }
      return originalParse(markdown);
    });
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        {
          ...draft('fallback-editor-state', 3),
          editorState: {
            selection: { anchor: 1, head: 5, updatedAt: 2 },
            scrollTop: 24,
          },
        },
      ],
    });
    ports.files.set(
      '/app/recovery/drafts/fallback-editor-state.md',
      'plain fallback body',
    );

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    await waitForEditorRestore(container, { scrollTop: '24' });
    const editor = getEditor(container);

    expect(editor.value).toBe('plain fallback body');
    expect(editor.getAttribute('data-restored-selection')).toMatch(/^1:\d+$/);
    expect(editor.getAttribute('data-restored-scroll-top')).toBe('24');

    await cleanup(container, root);
  });

  it('creates a new active recovery draft when startup has no active draft', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 10,
      createDraftId: () => 'created',
    });

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    const editor = getEditor(container);
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(editor.value).toBe('&nbsp;');
    expect(ports.files.get('/app/recovery/drafts/created.md')).toBe('');
    expect(index.drafts).toMatchObject([
      {
        draftId: 'created',
        status: 'active',
        recoveryPath: '/app/recovery/drafts/created.md',
      },
    ]);

    await cleanup(container, root);
  });

  it('opens the startup file as a file-backed document before recovery drafts', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/startup.md',
    });
    ports.files.set('/docs/startup.md', 'startup file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'should-not-create',
    });
    await seedIndex(
      createRecoveryPortsFromRuntime(ports),
      '/app/recovery/index.json',
      {
        schemaVersion: 1,
        drafts: [draft('existing-active', 5)],
      },
    );
    ports.files.set('/app/recovery/drafts/existing-active.md', 'draft body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();

    expect(getEditor(container).value).toBe('startup file body');
    expect(container.textContent).toContain('/docs/startup.md');
    expect(container.textContent).not.toContain('Draft');
    expect(ports.startupFilePathCalls).toBe(1);
    expect(ports.pendingFilePathCalls).toBe(0);
    expect(ports.readFileCalls).toContain('/docs/startup.md');

    await cleanup(container, root);
  });

  it('falls back to the pending file when startup has no file', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      pendingFilePath: '/docs/pending.md',
    });
    ports.files.set('/docs/pending.md', 'pending file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'should-not-create',
    });

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();

    expect(getEditor(container).value).toBe('pending file body');
    expect(container.textContent).toContain('/docs/pending.md');
    expect(ports.startupFilePathCalls).toBe(1);
    expect(ports.pendingFilePathCalls).toBe(1);

    await cleanup(container, root);
  });

  it('creates a fresh recovery draft when launched for a new QuickWrite window', async () => {
    window.history.replaceState(null, '', '/quick-write.html?newDraft=1');
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/startup.md',
      pendingFilePath: '/docs/pending.md',
    });
    ports.files.set('/docs/startup.md', 'startup file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'fresh-window-draft',
    });
    await seedIndex(
      createRecoveryPortsFromRuntime(ports),
      '/app/recovery/index.json',
      {
        schemaVersion: 1,
        drafts: [draft('existing-active', 5)],
      },
    );
    ports.files.set('/app/recovery/drafts/existing-active.md', 'existing body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();
    const editor = getEditor(container);
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(editor.value).toBe('&nbsp;');
    expect(ports.files.get('/app/recovery/drafts/existing-active.md')).toBe(
      'existing body',
    );
    expect(ports.files.get('/app/recovery/drafts/fresh-window-draft.md')).toBe(
      '',
    );
    expect(index.drafts.map((item) => item.draftId)).toContain(
      'fresh-window-draft',
    );
    expect(ports.startupFilePathCalls).toBe(0);
    expect(ports.pendingFilePathCalls).toBe(0);

    await cleanup(container, root);
  });

  it('creates a templated recovery draft only for a fresh newDraft launch', async () => {
    window.history.replaceState(
      null,
      '',
      '/quick-write.html?newDraft=1&template=meeting-notes',
    );
    const template = getQuickWriteTemplateById('meeting-notes');
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/startup.md',
      pendingFilePath: '/docs/pending.md',
    });
    ports.files.set('/docs/startup.md', 'startup file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'templated-window-draft',
    });
    await seedIndex(
      createRecoveryPortsFromRuntime(ports),
      '/app/recovery/index.json',
      {
        schemaVersion: 1,
        drafts: [draft('existing-active', 5)],
      },
    );
    ports.files.set('/app/recovery/drafts/existing-active.md', 'existing body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();
    const editor = getEditor(container);
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(template).not.toBe(null);
    expect(editor.value).toBe(template?.content);
    expect(
      ports.files.get('/app/recovery/drafts/templated-window-draft.md'),
    ).toBe(template?.content);
    expect(ports.files.get('/app/recovery/drafts/existing-active.md')).toBe(
      'existing body',
    );
    expect(index.drafts.map((item) => item.draftId)).toContain(
      'templated-window-draft',
    );
    expect(ports.startupFilePathCalls).toBe(0);
    expect(ports.pendingFilePathCalls).toBe(0);
    expect(container.textContent).toContain('Draft');

    await cleanup(container, root);
  });

  it('creates a blank fresh recovery draft for an unknown newDraft template id', async () => {
    window.history.replaceState(
      null,
      '',
      '/quick-write.html?newDraft=1&template=unknown',
    );
    const builtInTemplateContents = [
      'meeting-notes',
      'quick-brief',
      'daily-note',
    ].map((id) => getQuickWriteTemplateById(id)?.content);
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/startup.md',
      pendingFilePath: '/docs/pending.md',
    });
    ports.files.set('/docs/startup.md', 'startup file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'unknown-template-draft',
    });
    await seedIndex(
      createRecoveryPortsFromRuntime(ports),
      '/app/recovery/index.json',
      {
        schemaVersion: 1,
        drafts: [draft('existing-active', 5)],
      },
    );
    ports.files.set('/app/recovery/drafts/existing-active.md', 'existing body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();
    const editor = getEditor(container);
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(editor.value).toBe('&nbsp;');
    expect(
      ports.files.get('/app/recovery/drafts/unknown-template-draft.md'),
    ).toBe('');
    expect(ports.files.get('/app/recovery/drafts/existing-active.md')).toBe(
      'existing body',
    );
    for (const templateContent of builtInTemplateContents) {
      expect(templateContent).toBeTruthy();
      expect(editor.value).not.toBe(templateContent);
      expect(
        ports.files.get('/app/recovery/drafts/unknown-template-draft.md'),
      ).not.toBe(templateContent);
    }
    expect(index.drafts.map((item) => item.draftId)).toContain(
      'unknown-template-draft',
    );
    expect(ports.startupFilePathCalls).toBe(0);
    expect(ports.pendingFilePathCalls).toBe(0);
    expect(ports.readFileCalls).not.toContain('/docs/startup.md');

    await cleanup(container, root);
  });

  it('ignores template parameters during default startup recovery', async () => {
    window.history.replaceState(
      null,
      '',
      '/quick-write.html?template=meeting-notes',
    );
    const template = getQuickWriteTemplateById('meeting-notes');
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'should-not-create',
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [draft('existing-active', 5)],
    });
    ports.files.set('/app/recovery/drafts/existing-active.md', 'existing body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();

    expect(template).not.toBe(null);
    expect(getEditor(container).value).toBe('existing body');
    expect(ports.files.get('/app/recovery/drafts/existing-active.md')).toBe(
      'existing body',
    );
    expect(
      ports.files.get('/app/recovery/drafts/should-not-create.md'),
    ).toBeUndefined();

    await cleanup(container, root);
  });

  it('keeps startup file priority when a template parameter is present without newDraft', async () => {
    window.history.replaceState(
      null,
      '',
      '/quick-write.html?template=meeting-notes',
    );
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/startup.md',
    });
    ports.files.set('/docs/startup.md', 'startup file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'should-not-create',
    });

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();

    expect(getEditor(container).value).toBe('startup file body');
    expect(container.textContent).toContain('/docs/startup.md');
    expect(ports.readFileCalls).toContain('/docs/startup.md');
    expect(
      ports.files.get('/app/recovery/drafts/should-not-create.md'),
    ).toBeUndefined();

    await cleanup(container, root);
  });

  it('promotes a templated fresh draft to a file-backed document after Save To', async () => {
    window.history.replaceState(
      null,
      '',
      '/quick-write.html?newDraft=1&template=quick-brief',
    );
    const template = getQuickWriteTemplateById('quick-brief');
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/brief.md',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'templated-draft',
    });

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );

    await flushEffects();
    expect(getEditor(container).value).toBe(template?.content);

    await clickButton(container, 'Save To');
    await flushEffects();
    await setEditorValue(getEditor(container), 'file-backed template edit');
    await waitForQuickWriteAutosave();

    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;
    expect(ports.files.get('/docs/brief.md')).toBe('file-backed template edit');
    expect(ports.files.get('/app/recovery/drafts/templated-draft.md')).toBe(
      template?.content,
    );
    expect(
      index.drafts.find((item) => item.draftId === 'templated-draft'),
    ).toMatchObject({
      status: 'promoted',
    });
    expect(container.textContent).toContain('/docs/brief.md');
    expect(container.textContent).not.toContain('Draft');

    await cleanup(container, root);
  });

  it('uses one app config child directory before creating the drafts directory', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const runtime = createQuickWriteRuntimeAdapter({ ports });

    await runtime.openRecoveryDraft();

    expect(ports.ensureDirCalls).toEqual([
      '/app-config/quick-write-recovery',
      '/app-config/quick-write-recovery/drafts',
    ]);
    expect(ports.files.has('/app-config/quick-write/recovery/.dir')).toBe(
      false,
    );
  });

  it('inherits QuickWrite theme, editor font size, and locale settings', async () => {
    const settings = useSettingsStore.getState();
    settings.setThemePreference('dark');
    settings.setEditorFontSize('large');
    settings.setLocalePreference('zh-CN');

    const { container, root } = renderQuickWriteApp();

    await flushEffects();
    const shell = container.querySelector<HTMLElement>('.quick-write-app');

    expect(shell?.getAttribute('data-theme-preference')).toBe('dark');
    expect(shell?.getAttribute('data-editor-font-size')).toBe('large');
    expect(shell?.getAttribute('data-locale')).toBe('zh-CN');
    expect(shell?.getAttribute('data-resolved-locale')).toBe('zh-CN');
    expect(shell?.getAttribute('lang')).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(container.textContent).toContain('草稿');
    expect(container.textContent).toContain('文件');
    expect(
      container.querySelector('[aria-label="随手写保存状态"]')?.textContent,
    ).toBe('未保存编辑');
    expect(
      getComputedStyle(shell as HTMLElement)
        .getPropertyValue('--quick-write-bg-primary')
        .trim(),
    ).toBe('#111827');
    expect(
      getComputedStyle(shell as HTMLElement)
        .getPropertyValue('--quick-write-editor-font-size')
        .trim(),
    ).toBe('19px');

    await cleanup(container, root);
  });

  it('keeps chrome, editor body, and status bar as root-level shell regions', async () => {
    const { container, root } = renderQuickWriteApp();

    await flushEffects();
    const shell = container.querySelector<HTMLElement>('.quick-write-app');
    const body = container.querySelector<HTMLElement>('.quick-write-app-body');
    const documentSurface = container.querySelector<HTMLElement>(
      '.quick-write-document-surface',
    );
    const editor = getEditor(container);
    const statusBar = container.querySelector<HTMLElement>('.status-bar');
    const editorBreadcrumb = container.querySelector<HTMLElement>(
      '.editor-header__breadcrumb',
    );
    const titleMenu = container.querySelector<HTMLElement>(
      '.quick-write-title-menu',
    );

    expect(shell).not.toBe(null);
    expect(body?.parentElement).toBe(shell);
    expect(statusBar?.parentElement).toBe(shell);
    expect(statusBar?.textContent).toContain('Draft');
    expect(editorBreadcrumb?.textContent).toBe('');
    expect(documentSurface?.parentElement).toBe(body);
    expect(editor.closest('.quick-write-document-surface')).toBe(
      documentSurface,
    );
    expect(statusBar?.closest('.quick-write-app-body')).toBe(null);
    expect(titleMenu?.closest('.quick-write-app-body')).toBe(null);
    const shellChildren = Array.from(shell?.children ?? []);
    expect(shellChildren).toHaveLength(3);
    expect(shellChildren[0]?.contains(titleMenu)).toBe(true);
    expect(shellChildren[1]).toBe(body);
    expect(shellChildren[2]).toBe(statusBar);

    await cleanup(container, root);
  });

  it('falls back to the next active recovery draft when the latest draft cannot be read', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [draft('older-readable', 2), draft('latest-missing', 5)],
    });
    ports.files.set('/app/recovery/drafts/older-readable.md', 'older body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    const editor = getEditor(container);

    expect(editor.value).toBe('older body');
    expect(
      ports.files.get('/app/recovery/drafts/new-draft.md'),
    ).toBeUndefined();

    await cleanup(container, root);
  });

  it('creates a new recovery draft when every active recovery draft fails to read', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 15,
      createDraftId: () => 'replacement',
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [draft('older-missing', 2), draft('latest-missing', 5)],
    });

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );

    await flushEffects();
    const editor = getEditor(container);

    expect(editor.value).toBe('&nbsp;');
    expect(ports.files.get('/app/recovery/drafts/replacement.md')).toBe('');

    await cleanup(container, root);
  });

  it('writes edits back to the active recovery draft', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 20,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);
    await setEditorValue(editor, 'first line');
    await waitForQuickWriteAutosave();

    const status = container.querySelector(
      '[aria-label="QuickWrite document status"]',
    );
    expect(editor.value).toBe('first line');
    expect(status?.textContent).toBe('Open');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'first line',
    );

    await cleanup(container, root);
  });

  it('writes file-backed edits to sourcePath without updating the recovery draft', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await clickButton(container, 'Open');
    await flushEffects();
    const editor = getEditor(container);
    await setEditorValue(editor, 'file edit');
    await waitForQuickWriteAutosave();

    expect(ports.files.get('/docs/open.md')).toBe('file edit');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe('&nbsp;');

    await cleanup(container, root);
  });

  it('promotes a draft after Save To and sends later edits to the selected file', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/saved.md',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'draft body');
    await flushEffects();
    await clickButton(container, 'Save To');
    await flushEffects();
    await setEditorValue(editor, 'file body');
    await waitForQuickWriteAutosave();

    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;
    expect(ports.files.get('/docs/saved.md')).toBe('file body');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft body',
    );
    expect(
      index.drafts.find((item) => item.draftId === 'active'),
    ).toMatchObject({
      status: 'promoted',
    });

    await cleanup(container, root);
  });

  it('saves the current shared editor snapshot during Save To instead of stale shell content', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/snapshot-save.md',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await loadEditorMarkdownWithoutChange(editor, 'live save-to snapshot');
    await clickButton(container, 'Save To');
    await flushEffects();

    expect(ports.files.get('/docs/snapshot-save.md')).toBe(
      'live save-to snapshot',
    );
    expect(getEditor(container).value).toBe('live save-to snapshot');

    await cleanup(container, root);
  });

  it('ignores editor input while Save To is in flight', async () => {
    const deferredFileWrite = createDeferred<void>();
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/saved.md',
      writeFileAtomic(path, content, files) {
        if (path === '/docs/saved.md') {
          return deferredFileWrite.promise.then(() => {
            files.set(path, content);
          });
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'accepted draft');
    await flushEffects();
    await clickButton(container, 'Save To');
    await flushEffects();

    const editor = getEditor(container);
    expect(editor.disabled).toBe(true);
    await setEditorValue(editor, 'unaccepted in-flight input');
    await flushEffects();

    deferredFileWrite.resolve();
    await flushEffects();
    await flushEffects();

    expect(getEditor(container).value).toBe('accepted draft');
    expect(ports.files.get('/docs/saved.md')).toBe('accepted draft');
    expect(container.textContent).toContain('/docs/saved.md');
    expect(container.textContent).not.toContain('Draft');

    await cleanup(container, root);
  });

  it('keeps draft identity and exposes an error when Save To fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/fail.md',
      writeFileAtomic(path, content, files) {
        if (path === '/docs/fail.md') {
          return Promise.reject(new Error('save target unavailable'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft body');
    await flushEffects();
    await clickButton(container, 'Save To');
    await waitForText(container, 'save target unavailable');

    expect(container.textContent).toContain('Draft');
    expect(
      container.querySelector('[aria-label="QuickWrite operation error"]')
        ?.textContent,
    ).toContain('save target unavailable');
    expect(ports.files.get('/docs/fail.md')).toBeUndefined();
    await setEditorValue(getEditor(container), 'draft after failure');
    await waitForQuickWriteAutosave();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft after failure',
    );

    await cleanup(container, root);
  });

  it('blocks opening a Markdown file when flushing the current draft fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
      writeFileAtomic(path, content, files) {
        if (path === '/app/recovery/drafts/active.md' && content !== '') {
          return Promise.reject(new Error('draft flush failed'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    ports.files.set('/docs/open.md', 'file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty draft');
    await flushEffects();
    await clickButton(container, 'Open');
    await flushEffects();

    expect(ports.openCalls).toBe(0);
    expect(ports.readFileCalls).not.toContain('/docs/open.md');
    expect(getEditor(container).value).toBe('dirty draft');
    expect(container.textContent).toContain('draft flush failed');

    await cleanup(container, root);
  });

  it('opens a Markdown file as a file-backed document after flushing the current draft', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty draft');
    await flushEffects();
    await clickButton(container, 'Open');
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'dirty draft',
    );
    expect(ports.readFileCalls).toContain('/docs/open.md');
    expect(getEditor(container).value).toBe('file body');
    expect(container.textContent).toContain('/docs/open.md');

    await cleanup(container, root);
  });

  it('flushes the current shared editor snapshot before opening a Markdown file', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await loadEditorMarkdownWithoutChange(editor, 'live open snapshot');
    await clickButton(container, 'Open');
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'live open snapshot',
    );
    expect(getEditor(container).value).toBe('file body');

    await cleanup(container, root);
  });

  it('opens a runtime file-open event in the current window after flushing the current draft', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    ports.files.set('/docs/event.md', 'event file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty draft before event');
    await flushEffects();
    await emitRuntimeFileOpen(ports, '/docs/event.md');
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'dirty draft before event',
    );
    expect(ports.openCalls).toBe(0);
    expect(getEditor(container).value).toBe('event file body');
    expect(container.textContent).toContain('/docs/event.md');

    await cleanup(container, root);
  });

  it('keeps the current draft when opening a Markdown file fails to read', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/missing.md',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft before failed open');
    await flushEffects();
    await clickButton(container, 'Open');
    await waitForText(container, 'missing file: /docs/missing.md');

    expect(getEditor(container).value).toBe('draft before failed open');
    expect(container.textContent).toContain('Draft');
    expect(container.textContent).toContain('missing file: /docs/missing.md');
    expect(
      container.querySelector('[aria-label="QuickWrite save status"]')
        ?.textContent,
    ).toContain('Open failed: missing file: /docs/missing.md');
    expect(
      container.querySelector('[aria-label="QuickWrite save status"]')
        ?.textContent,
    ).not.toContain('Save failed');

    await cleanup(container, root);
  });

  it('keeps the current document when a runtime file-open event fails to read', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft before failed event');
    await flushEffects();
    await emitRuntimeFileOpen(ports, '/docs/missing-event.md');
    await waitForText(container, 'missing file: /docs/missing-event.md');

    expect(getEditor(container).value).toBe('draft before failed event');
    expect(container.textContent).toContain('Draft');
    expect(container.textContent).toContain(
      'missing file: /docs/missing-event.md',
    );
    expect(
      container.querySelector('[aria-label="QuickWrite save status"]')
        ?.textContent,
    ).toContain('Open failed: missing file: /docs/missing-event.md');

    await cleanup(container, root);
  });

  it('ignores editor input while Open is in flight', async () => {
    const deferredOpenRead = createDeferred<string>();
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'file body');
    const originalReadFile = ports.fileContent.readFile;
    ports.fileContent.readFile = async (path) => {
      if (path === '/docs/open.md') {
        ports.readFileCalls.push(path);
        return deferredOpenRead.promise;
      }
      return originalReadFile(path);
    };
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft before open');
    await flushEffects();
    await clickButton(container, 'Open');
    await flushEffects();

    const editor = getEditor(container);
    expect(editor.disabled).toBe(true);
    await setEditorValue(editor, 'unaccepted in-flight input');
    await flushEffects();

    deferredOpenRead.resolve('opened body');
    await flushEffects();
    await flushEffects();

    expect(getEditor(container).value).toBe('opened body');
    expect(container.textContent).toContain('/docs/open.md');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft before open',
    );

    await cleanup(container, root);
  });

  it('keeps the editor disabled while opened Markdown is still loading into Tiptap', async () => {
    const deferredOpenedBodyParse = createDeferred<EditorJSON>();
    const originalParse = MarkdownService.parse;
    vi.spyOn(MarkdownService, 'parse').mockImplementation((markdown) => {
      if (markdown === 'opened body') {
        return deferredOpenedBodyParse.promise;
      }
      return originalParse(markdown);
    });
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'opened body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft before open');
    await flushEffects();
    await clickButton(container, 'Open');
    await flushEffects();

    const editor = getEditor(container);
    expect(editor.disabled).toBe(true);
    await setEditorValue(editor, 'unaccepted pending load input');
    await flushEffects();
    expect(getEditor(container).value).toBe('opened body');

    deferredOpenedBodyParse.resolve(await originalParse('opened body'));
    await flushEffects();
    await flushEffects();

    expect(getEditor(container).disabled).toBe(false);
    expect(getEditor(container).value).toBe('opened body');
    expect(ports.files.get('/docs/open.md')).toBe('opened body');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft before open',
    );

    await cleanup(container, root);
  });

  it('keeps content and draft identity when Save To or Open dialogs are cancelled', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: null,
      openSelection: null,
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft body');
    await flushEffects();
    await clickButton(container, 'Save To');
    await flushEffects();
    await clickButton(container, 'Open');
    await flushEffects();

    expect(getEditor(container).value).toBe('draft body');
    expect(container.textContent).toContain('Draft');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft body',
    );
    expect(ports.saveCalls).toBe(1);
    expect(ports.openCalls).toBe(1);

    await cleanup(container, root);
  });

  it.skip('exports the latest QuickWrite document as standalone HTML without changing draft identity', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/exports/draft.html',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(
      getEditor(container),
      '# Export title\n\n- first item',
    );
    await waitForEditorMarkdown(getEditor(container), '- first item');
    await clickButton(container, 'Export HTML');
    await flushEffects();

    const html = ports.files.get('/exports/draft.html') ?? '';
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>QuickWrite</title>');
    expect(html).toContain('<main>');
    expect(html).toContain('<h1>Export title</h1>');
    expect(html).toContain('<li><p>first item</p></li>');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toContain(
      '# Export title\n\n- first item',
    );
    expect(container.textContent).toContain('Draft');
    expect(container.textContent).not.toContain('/exports/draft.html');
    expect(ports.saveDialogOptions).toEqual([
      expect.objectContaining({
        title: 'Export QuickWrite HTML',
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      }),
    ]);

    await cleanup(container, root);
  });

  it.skip('keeps file-backed identity after exporting an HTML copy', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      startupFilePath: '/docs/source.md',
      saveSelection: '/exports/source.html',
    });
    ports.files.set('/docs/source.md', 'source body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'should-not-create',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'file-backed export body');
    await flushEffects();
    await clickButton(container, 'Export HTML');
    await flushEffects();

    expect(ports.files.get('/docs/source.md')).toBe('file-backed export body');
    expect(ports.files.get('/exports/source.html')).toContain(
      '<p>file-backed export body</p>',
    );
    expect(container.textContent).toContain('/docs/source.md');
    expect(container.textContent).not.toContain('/exports/source.html');
    expect(
      ports.files.get('/app/recovery/drafts/should-not-create.md'),
    ).toBeUndefined();

    await cleanup(container, root);
  });

  it.skip('treats a cancelled HTML export path selection as a no-op', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: null,
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'cancelled export body');
    await flushEffects();
    await clickButton(container, 'Export HTML');
    await flushEffects();

    expect(ports.files.has('/exports/cancelled.html')).toBe(false);
    expect(
      container.querySelector('[aria-label="QuickWrite operation error"]'),
    ).toBe(null);
    expect(container.textContent).toContain('Draft');
    expect(getEditor(container).value).toBe('cancelled export body');

    await cleanup(container, root);
  });

  it.skip('does not write an HTML export when the pre-export flush fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/exports/blocked.html',
      writeFileAtomic(path, content, files) {
        if (path === '/app/recovery/drafts/active.md' && content !== '') {
          return Promise.reject(new Error('export flush failed'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty export body');
    await flushEffects();
    await clickButton(container, 'Export HTML');
    await waitForText(container, 'export flush failed');

    expect(ports.saveCalls).toBe(1);
    expect(ports.files.get('/exports/blocked.html')).toBeUndefined();
    expect(getEditor(container).value).toBe('dirty export body');
    expect(container.textContent).toContain('Draft');

    await cleanup(container, root);
  });

  it.skip('keeps the current identity and exposes an error when HTML export writing fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/exports/fail.html',
      writeFileAtomic(path, content, files) {
        if (path === '/exports/fail.html') {
          return Promise.reject(new Error('html export unavailable'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'export failure body');
    await flushEffects();
    await clickButton(container, 'Export HTML');
    await waitForText(container, 'html export unavailable');

    expect(ports.files.get('/exports/fail.html')).toBeUndefined();
    expect(container.textContent).toContain('Draft');
    expect(
      container.querySelector('[aria-label="QuickWrite operation error"]')
        ?.textContent,
    ).toContain('html export unavailable');

    await cleanup(container, root);
  });

  it.skip('prints the latest QuickWrite document through the system PDF print path without changing identity', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'print draft body');
    await flushEffects();
    await clickButton(container, 'Print to PDF');
    await flushEffects();

    expect(ports.printCalls).toBe(1);
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'print draft body',
    );
    expect(container.textContent).toContain('Draft');
    expect(getEditor(container).value).toBe('print draft body');
    expect([...ports.files.keys()].some((path) => path.endsWith('.pdf'))).toBe(
      false,
    );

    await cleanup(container, root);
  });

  it.skip('does not print when the pre-print flush fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      writeFileAtomic(path, content, files) {
        if (path === '/app/recovery/drafts/active.md' && content !== '') {
          return Promise.reject(new Error('print flush failed'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty print body');
    await flushEffects();
    await clickButton(container, 'Print to PDF');
    await waitForText(container, 'print flush failed');

    expect(ports.printCalls).toBe(0);
    expect(getEditor(container).value).toBe('dirty print body');
    expect(container.textContent).toContain('Draft');

    await cleanup(container, root);
  });

  it.skip('keeps the current document and clears busy state when system PDF print fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      async printDocument() {
        throw new Error('system print unavailable');
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'print failure body');
    await flushEffects();
    await clickButton(container, 'Print to PDF');
    await waitForText(container, 'system print unavailable');
    await openMenuGroup(container, 'menu.file');

    expect(ports.printCalls).toBe(1);
    expect(getEditor(container).disabled).toBe(false);
    expect(
      container.querySelector('[data-menu-item-id="menu.file.print_to_pdf"]'),
    ).toHaveProperty('disabled', false);
    expect(getEditor(container).value).toBe('print failure body');
    expect(container.textContent).toContain('PDF print failed');

    await cleanup(container, root);
  });

  it.skip('disables PDF print while a print operation is in flight', async () => {
    const deferredPrint = createDeferred<void>();
    const ports = createMemoryRuntimePorts('/app-config', {
      printDocument: () => deferredPrint.promise,
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'pending print body');
    await flushEffects();
    await clickButton(container, 'Print to PDF');
    await flushEffects();
    await openMenuGroup(container, 'menu.file');

    const printButton = container.querySelector<HTMLButtonElement>(
      '[data-menu-item-id="menu.file.print_to_pdf"]',
    );
    expect(printButton?.disabled).toBe(true);
    await clickButton(container, 'Print to PDF');
    await flushEffects();
    expect(ports.printCalls).toBe(1);

    deferredPrint.resolve();
    await flushEffects();
    await flushEffects();

    expect(printButton?.disabled).toBe(false);
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'pending print body',
    );

    await cleanup(container, root);
  });

  it.skip('disables HTML export while an export write is in flight', async () => {
    const deferredExportWrite = createDeferred<void>();
    let exportWriteCount = 0;
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/exports/pending.html',
      writeFileAtomic(path, content, files) {
        if (path === '/exports/pending.html') {
          exportWriteCount += 1;
          return deferredExportWrite.promise.then(() => {
            files.set(path, content);
          });
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'pending export body');
    await flushEffects();
    await clickButton(container, 'Export HTML');
    await flushEffects();
    await openMenuGroup(container, 'menu.file');

    const exportButton = container.querySelector<HTMLButtonElement>(
      '[data-menu-item-id="menu.file.export_html"]',
    );
    expect(exportButton?.disabled).toBe(true);
    await clickButton(container, 'Export HTML');
    await flushEffects();
    expect(exportWriteCount).toBe(1);
    expect(ports.saveCalls).toBe(1);

    deferredExportWrite.resolve();
    await flushEffects();
    await flushEffects();

    expect(ports.files.get('/exports/pending.html')).toContain(
      '<p>pending export body</p>',
    );

    await cleanup(container, root);
  });

  it('closes the current window only after a dirty document flush succeeds', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty draft');
    await clickButton(container, 'Close');
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'dirty draft',
    );
    expect(closeWindowMock).toHaveBeenCalledTimes(1);
    expect(getEditor(container).value).toBe('dirty draft');
    expect(
      container.querySelector('[aria-label="QuickWrite document status"]')
        ?.textContent,
    ).toBe('Open');

    await cleanup(container, root);
  });

  it('flushes the current shared editor snapshot before closing the window', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await loadEditorMarkdownWithoutChange(editor, 'live close snapshot');
    await clickButton(container, 'Close');
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'live close snapshot',
    );
    expect(closeWindowMock).toHaveBeenCalledTimes(1);

    await cleanup(container, root);
  });

  it('does not close the window when the dirty flush fails', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      writeFileAtomic(path, content, files) {
        if (path === '/app/recovery/drafts/active.md' && content !== '') {
          return Promise.reject(new Error('close flush failed'));
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'dirty draft');
    await flushEffects();
    await clickButton(container, 'Close');
    await flushEffects();

    expect(getEditor(container).value).toBe('dirty draft');
    expect(closeWindowMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('close flush failed');

    await cleanup(container, root);
  });

  it('keeps the editor writable when startup recovery fails', async () => {
    const runtime = {
      ...createQuickWriteRuntimeAdapter(),
      async openRecoveryDraft() {
        throw new Error('startup recovery failed');
      },
    };
    const { container, root } = renderQuickWriteApp(runtime);

    await flushEffects();
    const editor = getEditor(container);
    expect(editor.disabled).toBe(false);
    expect(container.textContent).not.toContain('startup recovery failed');

    await setEditorValue(editor, 'fallback draft content');
    await flushEffects();
    expect(getEditor(container).value).toBe('fallback draft content');
    expect(container.textContent).toContain('Draft');

    await clickButton(container, 'Close');
    await flushEffects();
    expect(closeWindowMock).toHaveBeenCalledTimes(1);
    expect(getEditor(container).value).toBe('fallback draft content');
    expect(container.textContent).not.toContain('startup recovery failed');

    await cleanup(container, root);
  });

  it('keeps a draft-backed session when draft promotion fails after Save To', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      saveSelection: '/docs/saved.md',
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const runtime = {
      ...createQuickWriteRuntimeAdapter({ ports, manager }),
      async markDraftPromoted() {
        throw new Error('promotion failed');
      },
    };
    const { container, root } = renderQuickWriteApp(runtime);
    await flushEffects();

    await setEditorValue(getEditor(container), 'draft body');
    await flushEffects();
    await clickButton(container, 'Save To');
    await waitForText(container, 'promotion failed');

    expect(container.textContent).toContain('Draft');
    expect(container.textContent).toContain('promotion failed');
    await setEditorValue(getEditor(container), 'draft after promotion failure');
    await waitForQuickWriteAutosave();

    expect(ports.files.get('/docs/saved.md')).toBe('draft body');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'draft after promotion failure',
    );

    await cleanup(container, root);
  });

  it('keeps the latest edit when editing again while a recovery save is pending', async () => {
    const deferredFirstWrite = createDeferred<void>();
    const deferredLatestWrite = createDeferred<void>();
    const ports = createMemoryPorts({
      writeFileAtomic(path, content, files) {
        if (
          path === '/app/recovery/drafts/active.md' &&
          content === 'first line'
        ) {
          return deferredFirstWrite.promise.then(() => {
            files.set(path, content);
          });
        }
        if (
          path === '/app/recovery/drafts/active.md' &&
          content === 'latest line'
        ) {
          return deferredLatestWrite.promise.then(() => {
            files.set(path, content);
          });
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: vi
        .fn()
        .mockReturnValueOnce(20)
        .mockReturnValueOnce(21)
        .mockReturnValueOnce(22),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'first line');
    await waitForQuickWriteAutosave();
    await setEditorValue(editor, 'latest line');
    await waitForQuickWriteAutosave();

    deferredFirstWrite.resolve();
    await flushEffects();
    await flushEffects();

    expect(editor.value).toBe('latest line');
    expect(
      container.querySelector('[aria-label="QuickWrite document status"]')
        ?.textContent,
    ).toBe('Dirty');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'first line',
    );

    deferredLatestWrite.resolve();
    await flushEffects();
    await flushEffects();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'latest line',
    );
    expect(
      container.querySelector('[aria-label="QuickWrite document status"]')
        ?.textContent,
    ).toBe('Open');

    await cleanup(container, root);
  });

  it('serializes deferred recovery saves so the final disk content is the latest edit', async () => {
    const deferredFirstWrite = createDeferred<void>();
    const ports = createMemoryPorts({
      writeFileAtomic(path, content, files) {
        if (
          path === '/app/recovery/drafts/active.md' &&
          content === 'first line'
        ) {
          return deferredFirstWrite.promise.then(() => {
            files.set(path, content);
          });
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2),
    });
    const runtime = createQuickWriteRuntimeAdapter({ manager });

    const firstSave = runtime.saveRecoveryDraft({
      draftId: 'active',
      content: 'first line',
      contentVersion: 1,
    });
    await Promise.resolve();

    const secondSave = runtime.saveRecoveryDraft({
      draftId: 'active',
      content: 'latest line',
      contentVersion: 2,
    });
    await Promise.resolve();

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBeUndefined();

    deferredFirstWrite.resolve();
    await Promise.all([firstSave, secondSave]);

    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'latest line',
    );
  });

  it('forwards editor metadata when saving a recovery draft through runtime', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 5,
    });
    const runtime = createQuickWriteRuntimeAdapter({ manager });

    await runtime.saveRecoveryDraft({
      draftId: 'active',
      content: 'body',
      contentVersion: 1,
      editorState: {
        selection: { anchor: 1, head: 4, updatedAt: 5 },
        scrollTop: 30,
      },
    });
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(index.drafts[0]).toMatchObject({
      draftId: 'active',
      editorState: {
        selection: { anchor: 1, head: 4, updatedAt: 5 },
        scrollTop: 30,
      },
    });
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe('body');
  });

  it('does not write recovery metadata for file-backed runtime saves', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
    });
    const runtime = createQuickWriteRuntimeAdapter({ ports, manager });

    await runtime.savePendingDocument({
      targetKind: 'file',
      path: '/docs/file.md',
      content: 'file body',
      contentVersion: 1,
      editorState: {
        selection: { anchor: 0, head: 4, updatedAt: 5 },
        scrollTop: 10,
      },
    });

    expect(ports.files.get('/docs/file.md')).toBe('file body');
    expect(ports.files.get('/app/recovery/index.json')).toBeUndefined();
  });

  it('does not expose the legacy memory URL or recovery path in visible copy', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });
    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [draft('visible-path-check', 1)],
    });
    ports.files.set('/app/recovery/drafts/visible-path-check.md', 'draft body');

    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();

    expect(container.textContent).not.toContain('quick-write://draft');
    expect(container.textContent).not.toContain(
      '/app/recovery/drafts/visible-path-check.md',
    );

    await cleanup(container, root);
  });

  it.skip('smokes current rich-editing entries through DOM paste, menu commands, serialization, and undo', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'plain text');
    expect(getEditorDom(editor).textContent).toContain('plain text');

    await clickButton(container, 'Select All');
    await clickButton(container, 'Bold');
    await waitForEditorMarkdown(editor, '**plain text**');
    expect(getEditorDom(editor).querySelector('strong')?.textContent).toBe(
      'plain text',
    );

    await clickButton(container, 'Select All');
    await clickButton(container, 'Italic');
    await waitForEditorMarkdown(editor, '***plain text***');
    expect(getEditorDom(editor).querySelector('em')?.textContent).toBe(
      'plain text',
    );

    await clickButton(container, 'Undo');
    await waitForEditorMarkdown(editor, '**plain text**');
    expect(getEditorDom(editor).querySelector('strong')?.textContent).toBe(
      'plain text',
    );

    await setEditorValue(editor, 'plain text');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Heading');
    await waitForEditorMarkdown(editor, '# plain text');
    expect(getEditorDom(editor).querySelector('h1')?.textContent).toBe(
      'plain text',
    );

    await clickButton(container, 'Body');
    await waitForEditorMarkdown(editor, 'plain text');
    expect(getEditorDom(editor).querySelector('p')?.textContent).toBe(
      'plain text',
    );

    await setEditorValue(editor, 'first item');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Bulleted List');
    await waitForEditorMarkdown(editor, '- first item');
    expect(getEditorDom(editor).querySelector('ul li')?.textContent).toBe(
      'first item',
    );

    await setEditorValue(editor, 'first item');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Numbered List');
    await waitForEditorMarkdown(editor, '1. first item');
    expect(getEditorDom(editor).querySelector('ol li')?.textContent).toBe(
      'first item',
    );

    await cleanup(container, root);
  });

  it('preserves pasted markdown link table and image syntax while exposing reserved command entries', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);
    const markdownWithDeferredRichBlocks = [
      '[Writer](https://example.com)',
      '',
      '| Key | Value |',
      '| --- | --- |',
      '| one | two |',
      '',
      '![local image](./assets/local.png)',
    ].join('\n');

    await setEditorValue(editor, markdownWithDeferredRichBlocks);
    await waitForEditorMarkdown(editor, '![local image](./assets/local.png)');

    expect(editor.value).toContain('[Writer](https://example.com)');
    expect(editor.value).toContain('| Key | Value |');
    expect(editor.value).toContain('| one | two');
    expect(editor.value).toContain('![local image](./assets/local.png)');

    await cleanup(container, root);
  });

  it('saves recovery editorState from the live rich editor selection and scroll container', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'selection source');
    const scrollContainer = editor.querySelector<HTMLElement>(
      '.editor-content-area',
    );
    if (scrollContainer) {
      scrollContainer.scrollTop = 33;
    }
    await clickButton(container, 'Select All');
    await setEditorValue(editor, 'selection source updated');
    await waitForEditorMarkdown(editor, 'selection source updated');
    await waitForQuickWriteAutosave();
    await waitForSavedRecoveryEditorState(ports);
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;

    expect(index.drafts[0]?.editorState?.selection?.head).toBeGreaterThan(0);
    expect(index.drafts[0]?.editorState?.scrollTop).toBe(33);

    await cleanup(container, root);
  });

  it('does not mount the rejected QuickWrite chrome or menu UI path', async () => {
    const ports = createMemoryRuntimePorts('/app-config');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    expect(container.querySelector('.quick-write-topbar')).toBe(null);
    expect(container.querySelector('.quick-write-menu-bar')).toBe(null);
    expect(container.querySelector('.quick-write-status-bar')).toBe(null);
    expect(
      container.querySelector('[data-menu-group-id="menu.file"]'),
    ).not.toBe(null);
    await openMenuGroup(container, 'menu.file');
    expect(
      container.querySelector('[data-menu-item-id="menu.file.export_html"]'),
    ).toBe(null);
    expect(
      container.querySelector('[data-menu-item-id="menu.file.print_to_pdf"]'),
    ).toBe(null);
    expect(container.querySelector('[data-menu-item-id]')).not.toBe(null);
    expect(container.textContent).not.toContain('Workspace');
    expect(container.textContent).not.toContain('Recent');

    await cleanup(container, root);
  });

  it.skip('applies cancels and removes links inside the current QuickWrite document', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);
    const prompt = vi.spyOn(window, 'prompt');

    prompt.mockReturnValue('example.com');
    await setEditorValue(editor, 'link target');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Link');
    await waitForEditorMarkdown(editor, '[link target](https://example.com)');

    expect(getEditorDom(editor).querySelector('a')?.textContent).toBe(
      'link target',
    );
    expect(getEditorDom(editor).querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com',
    );
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      '[link target](https://example.com)',
    );

    prompt.mockReturnValue(null);
    await setEditorValue(editor, 'cancel target');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Link');
    await waitForEditorMarkdown(editor, 'cancel target');
    expect(editor.value).toBe('cancel target');
    expect(getEditorDom(editor).querySelector('a')).toBe(null);

    prompt.mockReturnValue('https://remove.test');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Link');
    await waitForEditorMarkdown(editor, '[cancel target](https://remove.test)');

    prompt.mockReturnValue('');
    await clickButton(container, 'Select All');
    await clickButton(container, 'Link');
    await waitForEditorMarkdown(editor, 'cancel target');
    expect(editor.value).toBe('cancel target');
    expect(getEditorDom(editor).querySelector('a')).toBe(null);
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.edit_find'),
    ).toBe('edit.find');
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.edit_replace'),
    ).toBe('edit.replace');
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.format_link'),
    ).toBe('format.link');
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.export_html'),
    ).toBe(null);
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.print_to_pdf'),
    ).toBe(null);
    expect(resolveQuickWriteNativeMenuCommand('menu.quick_write.close')).toBe(
      'file.close',
    );
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.settings'),
    ).toBe('file.settings');
    expect(resolveQuickWriteNativeMenuCommand('menu.file.export_pdf')).toBe(
      null,
    );
    expect(
      resolveQuickWriteNativeMenuCommand('menu.quick_write.paragraph_table'),
    ).toBe('paragraph.table');

    await cleanup(container, root);
  });

  it.skip('inserts a default 3x3 table inside the current QuickWrite document', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'before table');
    await dispatchNativeMenuCommand('menu.quick_write.paragraph_table');
    await waitForEditorMarkdown(editor, '| ------ | ------ | ------ |');

    const table = getEditorDom(editor).querySelector('table');
    expect(table).not.toBe(null);
    expect(table?.querySelectorAll('tr')).toHaveLength(3);
    expect(table?.querySelectorAll('tr:first-child th')).toHaveLength(3);
    expect(editor.value).toContain('before table');
    expect(editor.value.match(/^\|/gm)).toHaveLength(4);
    expect(ports.files.get('/app/recovery/drafts/active.md')).toContain(
      '| ------ | ------ | ------ |',
    );
    expect(container.textContent).not.toContain('Workspace');
    expect(container.textContent).not.toContain('Recent');
    expect(container.textContent).not.toContain('Tabs');
    expect(container.textContent).not.toContain('Knowledge');

    await cleanup(container, root);
  });

  it.skip('runs find and replace inside the current QuickWrite document only', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'alpha beta alpha');
    await waitForEditorMarkdown(editor, 'alpha beta alpha');

    await dispatchNativeMenuCommand('menu.quick_write.edit_find');
    await setInputValue(getFindInput(container), 'alpha');
    await waitForText(container, '2 matches');
    await clickFindPanelButton(container, 'Next');
    await waitForText(container, '1/2');

    await clickFindPanelButton(container, 'Close');
    await flushEffects();
    expect(container.querySelector('.editor-find-panel')).toBe(null);
    expect(editor.value).toBe('alpha beta alpha');

    await clickButton(container, 'Replace');
    await setInputValue(getFindInput(container), 'missing');
    await waitForText(container, '0 matches');
    expect(getFindPanelButton(container, 'Next')).toHaveProperty(
      'disabled',
      true,
    );
    expect(container.textContent).not.toContain('Workspace');
    expect(container.textContent).not.toContain('Recent');

    await setInputValue(getFindInput(container), 'alpha');
    await setInputValue(getReplaceInput(container), 'gamma');
    await waitForText(container, '2 matches');
    await clickFindPanelButton(container, 'Replace');
    await waitForEditorMarkdown(editor, 'gamma beta alpha');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'gamma beta alpha',
    );

    await clickFindPanelButton(container, 'Replace All');
    await waitForEditorMarkdown(editor, 'gamma beta gamma');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'gamma beta gamma',
    );

    await cleanup(container, root);
  });

  it.skip('replaces the current query after navigating a previous match set', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();
    const editor = getEditor(container);

    await setEditorValue(editor, 'alpha alpha beta');
    await waitForEditorMarkdown(editor, 'alpha alpha beta');

    await clickButton(container, 'Replace');
    await setInputValue(getFindInput(container), 'alpha');
    await setInputValue(getReplaceInput(container), 'gamma');
    await waitForText(container, '2 matches');
    await clickFindPanelButton(container, 'Next');
    await waitForText(container, '1/2');
    await clickFindPanelButton(container, 'Next');
    await waitForText(container, '2/2');

    await setInputValue(getFindInput(container), 'beta');
    await waitForText(container, '1 match');
    await clickFindPanelButton(container, 'Replace');

    await waitForEditorMarkdown(editor, 'alpha alpha gamma');
    expect(ports.files.get('/app/recovery/drafts/active.md')).toBe(
      'alpha alpha gamma',
    );

    await cleanup(container, root);
  });

  it('maps native QuickWrite menu events to existing open and format commands', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/native-open.md',
    });
    ports.files.set('/docs/native-open.md', 'native file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await dispatchNativeMenuCommand('menu.quick_write.open_file');
    await flushEffects();
    expect(ports.openCalls).toBe(1);
    expect(getEditor(container).value).toBe('native file body');

    await clickButton(container, 'Select All');
    await dispatchNativeMenuCommand('menu.quick_write.format_bold');
    await waitForEditorMarkdown(getEditor(container), '**native file body**');

    await cleanup(container, root);
  });

  it('opens a new temporary document window without replacing the current document', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      enableNewWindow: true,
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'current draft body');
    await flushEffects();
    await clickButton(container, 'New Window');
    await flushEffects();

    expect(ports.newWindowCalls).toBe(1);
    expect(getEditor(container).value).toBe('current draft body');

    await cleanup(container, root);
  });

  it('opens the Writer settings panel from the QuickWrite file menu', async () => {
    const { container, root } = renderQuickWriteApp();
    await flushEffects();

    await clickButton(container, 'Settings');
    await flushEffects();

    const settingsDialog = container.querySelector('.settings-overlay');
    expect(settingsDialog).not.toBe(null);
    expect(settingsDialog?.textContent).toContain('通用设置');

    await cleanup(container, root);
  });

  it('maps native QuickWrite new-window menu events to the runtime port', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      enableNewWindow: true,
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await dispatchNativeMenuCommand('menu.quick_write.new_window');
    await flushEffects();

    expect(ports.newWindowCalls).toBe(1);

    await cleanup(container, root);
  });

  it('ignores native workspace menu events in QuickWrite', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/should-not-open.md',
    });
    ports.files.set('/docs/should-not-open.md', 'workspace event body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    await dispatchNativeMenuCommand('menu.file.open_workspace');
    await dispatchNativeMenuCommand('menu.file.open_folder');
    await dispatchNativeMenuCommand('menu.file.open_file');
    await dispatchNativeMenuCommand('menu.file.export_pdf');
    await dispatchNativeMenuCommand('menu.edit.find');
    await dispatchNativeMenuCommand('menu.format.link');
    await dispatchNativeMenuCommand('menu.paragraph.table');
    await flushEffects();

    expect(ports.openCalls).toBe(0);
    expect(ports.printCalls).toBe(0);

    await cleanup(container, root);
  });

  it('shows draft title in draft mode and file path for file-backed documents', async () => {
    const ports = createMemoryRuntimePorts('/app-config', {
      openSelection: '/docs/open.md',
    });
    ports.files.set('/docs/open.md', 'file body');
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports: createRecoveryPortsFromRuntime(ports),
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ ports, manager }),
    );
    await flushEffects();

    expect(container.textContent).toContain('Draft');
    await clickButton(container, 'Open File');
    await flushEffects();

    expect(container.textContent).toContain('/docs/open.md');
    expect(container.querySelector('.quick-write-status-bar')).toBe(null);

    await cleanup(container, root);
  });

  it('surfaces autosave pending and failed save status feedback', async () => {
    const deferredWrite = createDeferred<void>();
    const ports = createMemoryPorts({
      writeFileAtomic(path, content, files) {
        if (
          path === '/app/recovery/drafts/active.md' &&
          content === 'pending body'
        ) {
          return deferredWrite.promise.then(() => {
            throw new Error('autosave failed');
          });
        }
        files.set(path, content);
        return Promise.resolve();
      },
    });
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      createDraftId: () => 'active',
    });
    const { container, root } = renderQuickWriteApp(
      createQuickWriteRuntimeAdapter({ manager }),
    );
    await flushEffects();

    await setEditorValue(getEditor(container), 'pending body');
    await waitForQuickWriteAutosave();

    expect(
      container.querySelector('[aria-label="QuickWrite save status"]')
        ?.textContent,
    ).toBe('Autosaving...');

    deferredWrite.resolve();
    await flushEffects();
    await flushEffects();

    expect(
      container.querySelector('[aria-label="QuickWrite save status"]')
        ?.textContent,
    ).toContain('Save failed: autosave failed');

    await cleanup(container, root);
  });
});

const installEditorLayoutPolyfills = () => {
  const emptyClientRects = () =>
    ({
      item: () => null,
      length: 0,
      [Symbol.iterator]: function* () {},
    }) as DOMRectList;
  const zeroRect = () =>
    ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = emptyClientRects;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = zeroRect;
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 0);
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  }
};

type TestQuickWriteEditorElement = HTMLElement & {
  __singleDocumentEditorTestApi?: {
    setMarkdown(markdown: string): Promise<void>;
    loadMarkdownWithoutChange(markdown: string): Promise<void>;
    getMarkdown(): Promise<string | undefined>;
  };
  readonly disabled: boolean;
  readonly value: string;
};

const getEditor = (container: HTMLElement): TestQuickWriteEditorElement => {
  const editor = container.querySelector('.quick-write-editor');
  if (!editor) {
    throw new Error(`QuickWrite editor not found:\n${container.innerHTML}`);
  }

  if (!Object.getOwnPropertyDescriptor(editor, 'value')) {
    Object.defineProperty(editor, 'value', {
      configurable: true,
      get() {
        return editor.getAttribute('data-markdown') ?? '';
      },
    });
  }
  if (!Object.getOwnPropertyDescriptor(editor, 'disabled')) {
    Object.defineProperty(editor, 'disabled', {
      configurable: true,
      get() {
        return editor.getAttribute('data-disabled') === 'true';
      },
    });
  }
  if (!Object.getOwnPropertyDescriptor(editor, 'scrollTop')) {
    Object.defineProperty(editor, 'scrollTop', {
      configurable: true,
      get() {
        return getEditorDom(editor as TestQuickWriteEditorElement).scrollTop;
      },
      set(value: number) {
        getEditorDom(editor as TestQuickWriteEditorElement).scrollTop = value;
      },
    });
  }

  return editor as TestQuickWriteEditorElement;
};

const setEditorValue = async (
  editor: TestQuickWriteEditorElement,
  value: string,
): Promise<void> => {
  if (editor.disabled) {
    return;
  }

  await act(async () => {
    const testApi = await waitForEditorTestApi(editor);
    await testApi.setMarkdown(value);
  });
  await waitForEditorValue(editor, value);
};

const waitForQuickWriteAutosave = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, EDITOR_CONFIG.autosave.debounceMs + 20),
    );
  });
  for (let index = 0; index < 5; index += 1) {
    await flushEffects();
  }
};

const loadEditorMarkdownWithoutChange = async (
  editor: TestQuickWriteEditorElement,
  value: string,
): Promise<void> => {
  if (editor.disabled) {
    return;
  }

  await act(async () => {
    const testApi = await waitForEditorTestApi(editor);
    await testApi.loadMarkdownWithoutChange(value);
  });
};

const getEditorDom = (editor: TestQuickWriteEditorElement): HTMLElement => {
  return (
    editor.querySelector<HTMLElement>('.editor-content-area') ??
    editor.querySelector<HTMLElement>('.ProseMirror') ??
    editor
  );
};

const waitForEditorTestApi = async (
  editor: TestQuickWriteEditorElement,
): Promise<
  NonNullable<TestQuickWriteEditorElement['__singleDocumentEditorTestApi']>
> => {
  for (let index = 0; index < 20; index += 1) {
    if (editor.__singleDocumentEditorTestApi) {
      return editor.__singleDocumentEditorTestApi;
    }
    await flushEffects();
  }
  throw new Error('SingleDocumentEditor test API was not installed');
};

const waitForEditorValue = async (
  editor: TestQuickWriteEditorElement,
  value: string,
): Promise<void> => {
  let stableMatches = 0;
  for (let index = 0; index < 10; index += 1) {
    await flushEffects();
    if (editor.value === value) {
      stableMatches += 1;
      if (stableMatches >= 2) {
        return;
      }
    } else {
      stableMatches = 0;
    }
  }
};

const waitForEditorMarkdown = async (
  editor: TestQuickWriteEditorElement,
  value: string,
): Promise<void> => {
  for (let index = 0; index < 20; index += 1) {
    await flushEffects();
    if (editor.value.includes(value)) {
      return;
    }
  }
  throw new Error(`Expected markdown fragment not found: ${value}`);
};

const waitForSavedRecoveryEditorState = async (
  ports: ReturnType<typeof createMemoryPorts>,
): Promise<void> => {
  for (let index = 0; index < 20; index += 1) {
    await flushEffects();
    const indexFile = ports.files.get('/app/recovery/index.json');
    if (indexFile) {
      const parsed = JSON.parse(indexFile) as RecoveryDraftIndexFile;
      const editorState = parsed.drafts[0]?.editorState;
      if (
        editorState?.selection &&
        editorState.selection.head > 0 &&
        editorState.scrollTop === 33
      ) {
        return;
      }
    }
  }
  throw new Error('Expected saved recovery editorState was not written');
};

const waitForText = async (
  container: HTMLElement,
  text: string,
): Promise<void> => {
  for (let index = 0; index < 10; index += 1) {
    await flushEffects();
    if (container.textContent?.includes(text)) {
      return;
    }
  }
};

const waitForEditorRestore = async (
  container: HTMLElement,
  expected: { scrollTop: string; selection?: string },
): Promise<void> => {
  for (let index = 0; index < 10; index += 1) {
    await flushEffects();
    const editor = getEditor(container);
    if (
      editor.getAttribute('data-restored-scroll-top') === expected.scrollTop &&
      (expected.selection
        ? editor.getAttribute('data-restored-selection') === expected.selection
        : editor.getAttribute('data-restored-selection') !== null)
    ) {
      return;
    }
  }
};

const clickButton = async (
  container: HTMLElement,
  label: string,
): Promise<void> => {
  const menuTarget = getMenuTargetForButtonLabel(label);
  if (menuTarget) {
    const groupButton = container.querySelector<HTMLButtonElement>(
      `[data-menu-group-id="${menuTarget.groupId}"]`,
    );
    if (!groupButton) {
      const nativeMenuCommand = getNativeMenuCommandForButtonLabel(label);
      if (!nativeMenuCommand) {
        throw new Error(
          `QuickWrite menu group not found: ${menuTarget.groupId}`,
        );
      }
      await dispatchNativeMenuCommand(nativeMenuCommand);
      return;
    }
    if (groupButton.getAttribute('aria-expanded') !== 'true') {
      await act(async () => {
        groupButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
  }

  const button = menuTarget
    ? container.querySelector<HTMLButtonElement>(
        `[data-menu-item-id="${menuTarget.itemId}"]`,
      )
    : findButton(container, label);

  if (!button) {
    throw new Error(`QuickWrite button not found: ${label}`);
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const getNativeMenuCommandForButtonLabel = (label: string): string | null => {
  switch (label) {
    case 'Open':
    case 'Open File':
      return 'menu.quick_write.open_file';
    case 'Save To':
      return 'menu.quick_write.save_to';
    case 'Export HTML':
      return 'menu.quick_write.export_html';
    case 'Print to PDF':
      return 'menu.quick_write.print_to_pdf';
    case 'New Window':
      return 'menu.quick_write.new_window';
    case 'Close':
      return 'menu.quick_write.close';
    case 'Settings':
      return 'menu.quick_write.settings';
    case 'Select All':
      return 'menu.quick_write.edit_select_all';
    default:
      return null;
  }
};

const findButton = (
  container: HTMLElement,
  label: string,
): HTMLButtonElement | undefined =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent === label || item.textContent?.startsWith(label),
  ) ??
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) =>
      item.getAttribute('aria-label') === label ||
      item.getAttribute('aria-label')?.includes(label) ||
      item.getAttribute('aria-label')?.endsWith(`: ${label}`),
  );

const openMenuGroup = async (
  container: HTMLElement,
  groupId: string,
): Promise<void> => {
  const groupButton = container.querySelector<HTMLButtonElement>(
    `[data-menu-group-id="${groupId}"]`,
  );
  if (!groupButton) {
    throw new Error(`QuickWrite menu group not found: ${groupId}`);
  }
  if (groupButton.getAttribute('aria-expanded') === 'true') {
    return;
  }
  await act(async () => {
    groupButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const getMenuTargetForButtonLabel = (
  label: string,
): { groupId: string; itemId: string } | null => {
  if (
    [
      'Open',
      'Open File',
      'Save To',
      'Export HTML',
      'Print to PDF',
      'New Window',
      'Close',
      'Settings',
    ].some((prefix) => label.startsWith(prefix))
  ) {
    return {
      groupId: 'menu.file',
      itemId: label.startsWith('Open')
        ? 'menu.file.open_file'
        : label.startsWith('Save To')
          ? 'menu.file.save_to'
          : label.startsWith('Export HTML')
            ? 'menu.file.export_html'
            : label.startsWith('Print to PDF')
              ? 'menu.file.print_to_pdf'
              : label.startsWith('New Window')
                ? 'menu.file.new_window'
                : label.startsWith('Settings')
                  ? 'menu.file.settings'
                  : 'menu.file.close',
    };
  }
  if (
    ['Undo', 'Cut', 'Copy', 'Paste', 'Select All', 'Find', 'Replace'].some(
      (prefix) => label.startsWith(prefix),
    )
  ) {
    return {
      groupId: 'menu.edit',
      itemId: label.startsWith('Undo')
        ? 'menu.edit.undo'
        : label.startsWith('Cut')
          ? 'menu.edit.cut'
          : label.startsWith('Copy')
            ? 'menu.edit.copy'
            : label.startsWith('Paste')
              ? 'menu.edit.paste'
              : label.startsWith('Select All')
                ? 'menu.edit.select_all'
                : label.startsWith('Find')
                  ? 'menu.edit.find'
                  : 'menu.edit.replace',
    };
  }
  if (['Bold', 'Italic', 'Link'].some((prefix) => label.startsWith(prefix))) {
    return {
      groupId: 'menu.format',
      itemId: label.startsWith('Bold')
        ? 'menu.format.bold'
        : label.startsWith('Italic')
          ? 'menu.format.italic'
          : 'menu.format.link',
    };
  }
  if (
    ['Body', 'Heading', 'Bulleted List', 'Numbered List', 'Table'].some(
      (prefix) => label.startsWith(prefix),
    )
  ) {
    return {
      groupId: 'menu.paragraph',
      itemId: label.startsWith('Body')
        ? 'menu.paragraph.body'
        : label.startsWith('Heading')
          ? 'menu.paragraph.heading'
          : label.startsWith('Bulleted List')
            ? 'menu.paragraph.bullet_list'
            : label.startsWith('Numbered List')
              ? 'menu.paragraph.numbered_list'
              : 'menu.paragraph.table',
    };
  }
  return null;
};

const getFindPanel = (container: HTMLElement): HTMLElement => {
  const panel = container.querySelector<HTMLElement>('.editor-find-panel');
  if (!panel) {
    throw new Error(`QuickWrite find panel not found:\n${container.innerHTML}`);
  }
  return panel;
};

const getFindInput = (container: HTMLElement): HTMLInputElement => {
  const input =
    getFindPanel(container).querySelectorAll<HTMLInputElement>('input')[0];
  if (!input) {
    throw new Error(`QuickWrite find input not found:\n${container.innerHTML}`);
  }
  return input;
};

const getReplaceInput = (container: HTMLElement): HTMLInputElement => {
  const input =
    getFindPanel(container).querySelectorAll<HTMLInputElement>('input')[1];
  if (!input) {
    throw new Error(
      `QuickWrite replace input not found:\n${container.innerHTML}`,
    );
  }
  return input;
};

const getFindPanelButton = (
  container: HTMLElement,
  label: string,
): HTMLButtonElement => {
  const labels = getLocalizedFindPanelButtonLabels(label);
  const button = [
    ...getFindPanel(container).querySelectorAll<HTMLButtonElement>('button'),
  ].find(
    (item) =>
      labels.includes(item.textContent ?? '') ||
      labels.includes(item.getAttribute('aria-label') ?? ''),
  );
  if (!button) {
    throw new Error(
      `QuickWrite find panel button not found: ${label}\n${container.innerHTML}`,
    );
  }
  return button;
};

const getLocalizedFindPanelButtonLabels = (label: string): string[] => {
  switch (label) {
    case 'Next':
      return ['Next', '下一个'];
    case 'Close':
      return ['Close', '关闭', 'X'];
    case 'Replace':
      return ['Replace', '替换'];
    case 'Replace All':
      return ['Replace All', '全部替换'];
    default:
      return [label];
  }
};

const clickFindPanelButton = async (
  container: HTMLElement,
  label: string,
): Promise<void> => {
  const button = getFindPanelButton(container, label);

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const setInputValue = async (
  input: HTMLInputElement,
  value: string,
): Promise<void> => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;

  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  await flushEffects();
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
};

const dispatchNativeMenuCommand = async (id: string): Promise<void> => {
  const listener = tauriEventListeners.get(QUICK_WRITE_NATIVE_MENU_EVENT);
  if (!listener) {
    throw new Error(`Native menu listener not registered for ${id}`);
  }

  await act(async () => {
    listener({ payload: { id } });
  });
};

const emitRuntimeFileOpen = async (
  ports: MemoryRuntimePorts,
  path: string,
): Promise<void> => {
  await act(async () => {
    for (const listener of ports.fileOpenListeners) {
      listener(path);
    }
  });
};

const createMemoryPorts = (
  overrides: {
    writeFileAtomic?(
      path: string,
      content: string,
      files: Map<string, string>,
    ): Promise<void>;
  } = {},
): RecoveryDraftStoragePorts & {
  files: Map<string, string>;
} => {
  const files = new Map<string, string>();

  return {
    files,
    async readFile(path) {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`missing file: ${path}`);
      }
      return content;
    },
    async writeFileAtomic(path, content) {
      if (overrides.writeFileAtomic) {
        await overrides.writeFileAtomic(path, content, files);
        return;
      }
      files.set(path, content);
    },
    async ensureDir(path) {
      files.set(`${path}/.dir`, '');
    },
    async deleteFile(path) {
      files.delete(path);
    },
    async readJsonFile(path) {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`missing json: ${path}`);
      }
      return JSON.parse(content) as RecoveryDraftJsonValue;
    },
    async writeJsonFile(path, data) {
      files.set(path, JSON.stringify(data));
    },
  };
};

const createMemoryRuntimePorts = (
  appConfigDir: string,
  overrides: {
    openSelection?: string | string[] | null;
    pendingFilePath?: string | null;
    saveSelection?: string | null;
    startupFilePath?: string | null;
    printDocument?(): Promise<void>;
    writeFileAtomic?(
      path: string,
      content: string,
      files: Map<string, string>,
    ): Promise<void>;
    enableNewWindow?: boolean;
  } = {},
): MemoryRuntimePorts => {
  const storage = createMemoryPorts({
    writeFileAtomic: overrides.writeFileAtomic,
  });
  const ensureDirCalls: string[] = [];
  const readFileCalls: string[] = [];
  const saveDialogOptions: unknown[] = [];
  const fileOpenListeners = new Set<(path: string) => void>();

  const runtimePorts: MemoryRuntimePorts = {
    files: storage.files,
    ensureDirCalls,
    fileOpenListeners,
    openCalls: 0,
    pendingFilePathCalls: 0,
    printCalls: 0,
    saveCalls: 0,
    saveDialogOptions,
    startupFilePathCalls: 0,
    newWindowCalls: 0,
    readFileCalls,
    appConfig: {
      async getAppConfigDir() {
        return appConfigDir;
      },
      readJsonFile: storage.readJsonFile,
      writeJsonFile: storage.writeJsonFile,
    },
    fileContent: {
      async readFile(path) {
        readFileCalls.push(path);
        return storage.readFile(path);
      },
      writeFileAtomic: storage.writeFileAtomic,
      async ensureDir(path) {
        ensureDirCalls.push(path);
        await storage.ensureDir(path);
      },
      deleteFile: storage.deleteFile,
    },
    fileDialog: {
      async open() {
        runtimePorts.openCalls += 1;
        return overrides.openSelection ?? null;
      },
      async save(options) {
        runtimePorts.saveCalls += 1;
        saveDialogOptions.push(options);
        return overrides.saveSelection ?? null;
      },
    },
    startupFile: {
      async getStartupFilePath() {
        runtimePorts.startupFilePathCalls += 1;
        return overrides.startupFilePath ?? null;
      },
      async getPendingFilePath() {
        runtimePorts.pendingFilePathCalls += 1;
        return overrides.pendingFilePath ?? null;
      },
      async listenFileOpen(listener) {
        fileOpenListeners.add(listener);
        return () => {
          fileOpenListeners.delete(listener);
        };
      },
    },
    quickWritePrint: {
      async printDocument() {
        runtimePorts.printCalls += 1;
        await overrides.printDocument?.();
      },
    },
  };
  if (overrides.enableNewWindow) {
    runtimePorts.quickWriteWindow = {
      async openNewTemporaryDocumentWindow() {
        runtimePorts.newWindowCalls += 1;
      },
    };
  }
  return runtimePorts;
};

type MemoryRuntimePorts = Pick<
  RuntimePorts,
  'appConfig' | 'fileContent' | 'fileDialog' | 'startupFile'
> & {
  files: Map<string, string>;
  ensureDirCalls: string[];
  fileOpenListeners: Set<(path: string) => void>;
  openCalls: number;
  pendingFilePathCalls: number;
  printCalls: number;
  saveCalls: number;
  saveDialogOptions: unknown[];
  startupFilePathCalls: number;
  newWindowCalls: number;
  readFileCalls: string[];
  quickWritePrint: {
    printDocument(): Promise<void>;
  };
  quickWriteWindow?: {
    openNewTemporaryDocumentWindow(): Promise<void>;
  };
};

const createRecoveryPortsFromRuntime = (
  ports: Pick<RuntimePorts, 'appConfig' | 'fileContent'>,
): RecoveryDraftStoragePorts => ({
  readFile: ports.fileContent.readFile,
  writeFileAtomic: ports.fileContent.writeFileAtomic,
  async ensureDir(path) {
    if (!ports.fileContent.ensureDir) {
      throw new Error('missing ensureDir');
    }
    await ports.fileContent.ensureDir(path);
  },
  async deleteFile(path) {
    if (!ports.fileContent.deleteFile) {
      throw new Error('missing deleteFile');
    }
    await ports.fileContent.deleteFile(path);
  },
  readJsonFile: ports.appConfig.readJsonFile,
  writeJsonFile: ports.appConfig.writeJsonFile,
});

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

const seedIndex = async (
  ports: RecoveryDraftStoragePorts,
  path: string,
  index: RecoveryDraftIndexFile,
): Promise<void> => {
  await ports.writeJsonFile(path, index as unknown as RecoveryDraftJsonValue);
};

const draft = (draftId: string, updatedAt: number) => ({
  schemaVersion: 1 as const,
  draftId,
  recoveryPath: `/app/recovery/drafts/${draftId}.md`,
  status: 'active' as const,
  updatedAt,
  displayLabel: 'Recovered draft',
  sourcePath: null,
  contentVersion: 1,
});
