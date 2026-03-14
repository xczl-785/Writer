import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('sidebar responsive behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(
    join(currentDir, '..', '..', 'app', 'App.tsx'),
    'utf-8',
  );
  const editorTsx = readFileSync(
    join(currentDir, '..', '..', 'domains', 'editor', 'core', 'Editor.tsx'),
    'utf-8',
  );

  it('uses overlay sidebar behavior in min tier and closes on backdrop click', () => {
    expect(appTsx).toContain("const isMinTier = tier === 'min'");
    expect(appTsx).toContain(
      'const isOverlaySidebar = isMinTier && isSidebarVisible',
    );
    expect(appTsx).toContain('data-overlay-mode={isOverlaySidebar}');
    expect(appTsx).toContain(
      'onClick={() => chrome.actions.setSidebarVisible(false)}',
    );
    expect(appTsx).toContain(
      'const previousIsMinTierRef = useRef<boolean | null>(null)',
    );
    expect(appTsx).toContain(
      'const sidebarVisibilityRef = useRef<boolean>(isSidebarVisible)',
    );
    expect(appTsx).toContain(
      'const sidebarVisibilityBeforeMinRef = useRef<boolean | null>(null)',
    );
    expect(appTsx).toContain('if (previousIsMinTier === isMinTier)');
    expect(appTsx).toContain(
      'sidebarVisibilityBeforeMinRef.current = sidebarVisibilityRef.current',
    );
    expect(appTsx).toContain('setIsSidebarVisible(sidebarVisibilityBeforeMin)');
    expect(appTsx).toContain('className="fixed inset-y-0 left-0 z-40"');
    expect(appTsx).toContain(
      'className="flex-1 flex flex-col relative min-w-0 h-full"',
    );
  });

  it('degrades breadcrumb/header content to compact filename in min tier', () => {
    expect(editorTsx).toContain("const isMinTier = viewportTier === 'min'");
    expect(editorTsx).toContain('const compactFileName =');
    expect(editorTsx).toContain('... /');
  });

  it('moves legacy sidebar toggle behavior into the platform title bars', () => {
    const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');
    const titleBarTsx = readFileSync(
      join(currentDir, '..', 'chrome', 'WindowsTitleBar.tsx'),
      'utf-8',
    );
    const macTitleBarTsx = readFileSync(
      join(currentDir, '..', 'chrome', 'MacTitleBar.tsx'),
      'utf-8',
    );
    const editorImplTsx = readFileSync(
      join(
        currentDir,
        '..',
        '..',
        'domains',
        'editor',
        'core',
        'EditorImpl.tsx',
      ),
      'utf-8',
    );
    expect(sidebarTsx).not.toContain('onToggleFocusZen?: () => void;');
    expect(sidebarTsx).not.toContain('handleCollapseButtonClick');
    expect(sidebarTsx).not.toContain('handleCollapseButtonDoubleClick');
    expect(sidebarTsx).not.toContain("t('sidebar.collapse')");
    const sharedBehaviorTs = readFileSync(
      join(currentDir, '..', 'chrome', 'useSidebarToggleBehavior.ts'),
      'utf-8',
    );
    expect(titleBarTsx).toContain('useSidebarToggleBehavior');
    expect(sharedBehaviorTs).toContain(
      'const clickTimerRef = useRef<number | null>(null);',
    );
    expect(sharedBehaviorTs).toContain('onSetFocusZen(!isFocusZen)');
    expect(sharedBehaviorTs).toContain('if (isFocusZen) {');
    expect(sharedBehaviorTs).toContain('onToggleSidebar();');
    expect(titleBarTsx).toContain('<SidebarToggleIcon />');
    expect(macTitleBarTsx).toContain('useSidebarToggleBehavior');
    expect(macTitleBarTsx).toContain('<SidebarToggleIcon />');
    expect(editorImplTsx).not.toContain(
      'className="editor-header__sidebar-btn"',
    );
    expect(editorImplTsx).not.toContain('aria-label="Expand sidebar"');
    expect(editorImplTsx).not.toContain('useSidebarToggleBehavior');
    expect(editorTsx).not.toContain('isSidebarVisible?: boolean');
    expect(editorTsx).not.toContain('onToggleSidebar?: () => void');
  });
});
