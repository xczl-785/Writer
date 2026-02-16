import { describe, expect, it } from 'vitest';
import {
  ensureMarkdownExtension,
  filterVisibleNodes,
  getDisplayName,
  getFileExtension,
  getParentPath,
  hasInvalidNodeName,
  isMarkdownFile,
  resolveCreateBasePath,
} from './pathing';

describe('sidebar pathing', () => {
  it('uses selected directory as create base path', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: '/ws/notes',
      selectedType: 'directory',
      activeFile: '/ws/a.md',
    });

    expect(base).toBe('/ws/notes');
  });

  it('uses selected file parent as create base path', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: '/ws/notes/a.md',
      selectedType: 'file',
      activeFile: null,
    });

    expect(base).toBe('/ws/notes');
  });

  it('falls back to active file parent when no selection', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: null,
      selectedType: null,
      activeFile: '/ws/drafts/a.md',
    });

    expect(base).toBe('/ws/drafts');
  });

  it('falls back to workspace root when nothing selected and no active file', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: null,
      selectedType: null,
      activeFile: null,
    });

    expect(base).toBe('/ws');
  });

  it('validates invalid node names', () => {
    expect(hasInvalidNodeName('')).toBe(true);
    expect(hasInvalidNodeName('a/b')).toBe(true);
    expect(hasInvalidNodeName('a\\b')).toBe(true);
    expect(hasInvalidNodeName('ok.md')).toBe(false);
  });

  it('gets parent path for absolute path', () => {
    expect(getParentPath('/ws/notes/a.md')).toBe('/ws/notes');
  });

  it('detects markdown file extensions', () => {
    expect(getFileExtension('a.md')).toBe('.md');
    expect(isMarkdownFile('a.md')).toBe(true);
    expect(isMarkdownFile('a.markdown')).toBe(true);
    expect(isMarkdownFile('a.txt')).toBe(false);
  });

  it('builds display name without markdown extension', () => {
    expect(
      getDisplayName({ path: '/ws/a.md', name: 'a.md', type: 'file' }),
    ).toBe('a');
    expect(
      getDisplayName({ path: '/ws/docs', name: 'docs', type: 'directory' }),
    ).toBe('docs');
  });

  it('ensures markdown extension when creating files', () => {
    expect(ensureMarkdownExtension('note')).toBe('note.md');
    expect(ensureMarkdownExtension('note.md')).toBe('note.md');
    expect(ensureMarkdownExtension('note.markdown')).toBe('note.markdown');
  });

  it('filters out non-markdown files and keeps directories visible', () => {
    const filtered = filterVisibleNodes([
      {
        path: '/ws/a.md',
        name: 'a.md',
        type: 'file',
      },
      {
        path: '/ws/a.txt',
        name: 'a.txt',
        type: 'file',
      },
      {
        path: '/ws/folder',
        name: 'folder',
        type: 'directory',
        children: [
          { path: '/ws/folder/b.md', name: 'b.md', type: 'file' },
          { path: '/ws/folder/b.txt', name: 'b.txt', type: 'file' },
        ],
      },
      {
        path: '/ws/empty',
        name: 'empty',
        type: 'directory',
        children: [{ path: '/ws/empty/c.txt', name: 'c.txt', type: 'file' }],
      },
      {
        path: '/ws/new-folder',
        name: 'new-folder',
        type: 'directory',
        children: [],
      },
    ]);

    expect(filtered).toEqual([
      { path: '/ws/a.md', name: 'a.md', type: 'file' },
      {
        path: '/ws/folder',
        name: 'folder',
        type: 'directory',
        children: [{ path: '/ws/folder/b.md', name: 'b.md', type: 'file' }],
      },
      {
        path: '/ws/empty',
        name: 'empty',
        type: 'directory',
        children: [],
      },
      {
        path: '/ws/new-folder',
        name: 'new-folder',
        type: 'directory',
        children: [],
      },
    ]);
  });
});
