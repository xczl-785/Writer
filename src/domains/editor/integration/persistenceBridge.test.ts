import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { flushEditorOnBlur, persistEditorUpdate } from './persistenceBridge';
import { MarkdownService } from '../../../services/markdown/MarkdownService';
import { AutosaveService } from '../../file/services/AutosaveService';

vi.mock('../../../services/markdown/MarkdownService', () => ({
  MarkdownService: {
    serialize: vi.fn(),
  },
}));

vi.mock('../../file/services/AutosaveService', () => ({
  AutosaveService: {
    schedule: vi.fn(),
    flush: vi.fn(),
  },
}));

describe('persistenceBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists editor markdown and schedules autosave when active file is present', async () => {
    const editor = {
      getJSON: () => ({ type: 'doc' }),
    } as unknown as TiptapEditor;
    vi.mocked(MarkdownService.serialize).mockResolvedValue('abc');

    const updateFileContent = vi.fn();
    const setDirty = vi.fn();

    await persistEditorUpdate({
      editor,
      activeFile: '/a.md',
      isLoading: false,
      updateFileContent,
      setDirty,
    });

    expect(updateFileContent).toHaveBeenCalledWith('/a.md', 'abc');
    expect(setDirty).toHaveBeenCalledWith('/a.md', true);
    expect(AutosaveService.schedule).toHaveBeenCalledWith('/a.md', 'abc');
  });

  it('flushes autosave only when active file is present', () => {
    flushEditorOnBlur('/a.md');
    flushEditorOnBlur(null);
    expect(AutosaveService.flush).toHaveBeenCalledTimes(1);
    expect(AutosaveService.flush).toHaveBeenCalledWith('/a.md');
  });
});
