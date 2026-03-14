import { describe, expect, it, vi } from 'vitest';
import { classifyDroppedPaths, extractDroppedPaths } from './droppedPaths';

describe('droppedPaths', () => {
  it('extracts unique file-system paths from dropped payloads', () => {
    const paths = extractDroppedPaths([
      { path: '/ws/a' },
      { path: '/ws/a' },
      { path: '   ' },
      {},
      { path: '/ws/b' },
    ]);

    expect(paths).toEqual(['/ws/a', '/ws/b']);
  });

  it('classifies dropped paths by file-system kind', async () => {
    const getPathKind = vi.fn(async (path: string) => {
      if (path === '/ws/folder') return 'directory' as const;
      if (path === '/ws/file.md') return 'file' as const;
      if (path === '/ws/missing') return 'missing' as const;
      return 'other' as const;
    });

    const result = await classifyDroppedPaths(
      ['/ws/folder', '/ws/file.md', '/ws/missing', '/ws/socket'],
      getPathKind,
    );

    expect(result).toEqual({
      directories: ['/ws/folder'],
      files: ['/ws/file.md'],
      missing: ['/ws/missing'],
      other: ['/ws/socket'],
    });
  });
});
