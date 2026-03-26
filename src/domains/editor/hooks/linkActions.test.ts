import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { applyLinkAction } from './linkActions';

describe('applyLinkAction', () => {
  const chain = {
    focus: vi.fn(),
    extendMarkRange: vi.fn(),
    setLink: vi.fn(),
    unsetLink: vi.fn(),
    run: vi.fn(),
  };

  const editor = {
    chain: vi.fn(() => chain),
    isActive: vi.fn(),
    getAttributes: vi.fn(),
  } as unknown as Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'prompt').mockImplementation(() => null);
    chain.focus.mockReturnValue(chain);
    chain.extendMarkRange.mockReturnValue(chain);
    chain.setLink.mockReturnValue(chain);
    chain.unsetLink.mockReturnValue(chain);
    chain.run.mockReturnValue(true);
  });

  it('sets link when prompt returns a url', () => {
    vi.mocked(window.prompt).mockReturnValue('https://example.com');
    vi.mocked(editor.isActive).mockReturnValue(false);
    vi.mocked(editor.getAttributes).mockReturnValue({});

    const applied = applyLinkAction(editor);

    expect(applied).toBe('applied');
    expect(chain.extendMarkRange).toHaveBeenCalledWith('link');
    expect(chain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
  });

  it('unsets active link when prompt returns empty string', () => {
    vi.mocked(window.prompt).mockReturnValue('');
    vi.mocked(editor.isActive).mockReturnValue(true);
    vi.mocked(editor.getAttributes).mockReturnValue({
      href: 'https://old.test',
    });

    const applied = applyLinkAction(editor);

    expect(applied).toBe('applied');
    expect(chain.extendMarkRange).toHaveBeenCalledWith('link');
    expect(chain.unsetLink).toHaveBeenCalled();
    expect(chain.setLink).not.toHaveBeenCalled();
  });

  it('does nothing when prompt is cancelled', () => {
    vi.mocked(window.prompt).mockReturnValue(null);
    vi.mocked(editor.isActive).mockReturnValue(false);
    vi.mocked(editor.getAttributes).mockReturnValue({});

    const applied = applyLinkAction(editor);

    expect(applied).toBe('cancelled');
    expect(chain.setLink).not.toHaveBeenCalled();
    expect(chain.unsetLink).not.toHaveBeenCalled();
  });
});
