import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  it('exports shared core entry points without exposing runtime primitives', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const indexSource = readFileSync(join(currentDir, 'index.ts'), 'utf-8');
    const runtimeIndexSource = readFileSync(
      join(currentDir, 'runtime', 'index.ts'),
      'utf-8',
    );

    expect(indexSource).toContain("export * from './autosave';");
    expect(indexSource).toContain("export * from './command';");
    expect(indexSource).toContain("export * from './editor';");
    expect(indexSource).toContain("export * from './save';");
    expect(indexSource).toContain("export * from './session';");
    expect(indexSource).not.toContain("export * from './runtime';");
    expect(runtimeIndexSource).toBe("export * from './fsPrimitives';\n");

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
