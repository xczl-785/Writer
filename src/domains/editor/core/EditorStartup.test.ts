import { describe, expect, it, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { persistEditorUpdate } from './integration/persistenceBridge';
import { MarkdownService } from '../../services/markdown/MarkdownService';
import { ErrorService } from '../../services/error/ErrorService';

vi.mock('../../services/markdown/MarkdownService', () => ({
  MarkdownService: {
    serialize: vi.fn(),
  },
}));

vi.mock('../../services/error/ErrorService', () => ({
  ErrorService: {
    handle: vi.fn(),
  },
}));

describe('Editor startup and persistence contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a precise serialization failure message', async () => {
    const editor = {
      getJSON: () => ({ type: 'doc' }),
    } as unknown as TiptapEditor;

    vi.mocked(MarkdownService.serialize).mockRejectedValue(
      new Error('serialize failed'),
    );

    await persistEditorUpdate({
      editor,
      activeFile: '/tmp/a.md',
      isLoading: false,
      updateFileContent: vi.fn(),
      setDirty: vi.fn(),
    });

    expect(ErrorService.handle).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to serialize editor content',
    );
  });

  it('has a favicon to prevent startup 404 noise', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const faviconPath = join(
      currentDir,
      '..',
      '..',
      '..',
      'public',
      'favicon.ico',
    );
    expect(existsSync(faviconPath)).toBe(true);
  });
});
