import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as coreRuntime from './runtime';
import {
  FIND_MATCH_LIMIT,
  LoadDocument,
  SaveScheduler,
  clearNextPasteIntent,
  collectFindTextMatches,
  createEmptySingleDocumentSession,
  createMarkdownClipboardTextParser,
  getActiveFindMatchIndex,
  isTerminalSaveStatus,
  menuCommandBus,
  reduceSaveStatus,
  reduceSingleDocumentSession,
} from './index';

describe('core public surface', () => {
  it('keeps Writer src/core as package re-export shims', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const indexSource = readFileSync(join(currentDir, 'index.ts'), 'utf-8');
    const runtimeIndexSource = readFileSync(
      join(currentDir, 'runtime', 'index.ts'),
      'utf-8',
    );

    expect(indexSource).toBe("export * from '@writer/core';\n");
    expect(runtimeIndexSource).toBe("export * from '@writer/core/runtime';\n");
    expect('RuntimePorts' in coreRuntime).toBe(false);

    expect(typeof SaveScheduler).toBe('function');
    expect(typeof menuCommandBus.dispatch).toBe('function');
    expect(FIND_MATCH_LIMIT).toBe(1000);
    expect(LoadDocument.name).toBe('loadDocument');
    expect(typeof createMarkdownClipboardTextParser).toBe('function');
    expect(typeof clearNextPasteIntent).toBe('function');
    expect(typeof collectFindTextMatches).toBe('function');
    expect(typeof getActiveFindMatchIndex).toBe('function');
    expect(
      reduceSaveStatus('idle', {
        type: 'scheduled',
        target: { path: '/note.md' },
      }),
    ).toBe('dirty');
    expect(isTerminalSaveStatus('saved')).toBe(true);
    expect(createEmptySingleDocumentSession().status).toBe('empty');
    expect(
      reduceSingleDocumentSession(createEmptySingleDocumentSession(), {
        type: 'opened',
        path: '/note.md',
      }).status,
    ).toBe('open');
  });
});
