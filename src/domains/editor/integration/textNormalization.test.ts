import { describe, expect, it } from 'vitest';
import {
  stripCommonIndent,
  isSoleDegenerateCodeBlock,
  isRicherParse,
} from './textNormalization';

describe('stripCommonIndent', () => {
  it('removes uniform 4-space indent from all lines', () => {
    const input = '    line1\n    line2\n    line3';
    expect(stripCommonIndent(input)).toBe('line1\nline2\nline3');
  });

  it('removes uniform tab indent from all lines', () => {
    const input = '\tline1\n\tline2';
    expect(stripCommonIndent(input)).toBe('line1\nline2');
  });

  it('preserves relative indentation between lines', () => {
    const input = '    line1\n        line2\n    line3';
    expect(stripCommonIndent(input)).toBe('line1\n    line2\nline3');
  });

  it('ignores empty lines when computing common indent', () => {
    const input = '    line1\n\n    line2';
    expect(stripCommonIndent(input)).toBe('line1\n\nline2');
  });

  it('returns original text when no common indent exists', () => {
    const input = 'line1\n    line2\nline3';
    expect(stripCommonIndent(input)).toBe('line1\n    line2\nline3');
  });

  it('returns original text for single line without indent', () => {
    expect(stripCommonIndent('hello')).toBe('hello');
  });

  it('returns original text for empty string', () => {
    expect(stripCommonIndent('')).toBe('');
  });

  it('handles mixed tabs and spaces by returning original text', () => {
    const input = '\tline1\n    line2';
    expect(stripCommonIndent(input)).toBe('\tline1\n    line2');
  });
});

describe('isSoleDegenerateCodeBlock', () => {
  it('returns true for doc with single codeBlock child', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'code' }],
        },
      ],
    };
    expect(isSoleDegenerateCodeBlock(json)).toBe(true);
  });

  it('returns false for doc with heading + paragraph', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
      ],
    };
    expect(isSoleDegenerateCodeBlock(json)).toBe(false);
  });

  it('returns false for doc with multiple children including codeBlock', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'code' }],
        },
      ],
    };
    expect(isSoleDegenerateCodeBlock(json)).toBe(false);
  });

  it('returns false for null or missing content', () => {
    expect(isSoleDegenerateCodeBlock(null)).toBe(false);
    expect(isSoleDegenerateCodeBlock({ type: 'doc' })).toBe(false);
    expect(isSoleDegenerateCodeBlock({ type: 'doc', content: [] })).toBe(false);
  });
});

describe('isRicherParse', () => {
  it('returns true when retry has more top-level nodes', () => {
    const original = { type: 'doc', content: [{ type: 'codeBlock' }] };
    const retry = {
      type: 'doc',
      content: [{ type: 'heading' }, { type: 'paragraph' }],
    };
    expect(isRicherParse(original, retry)).toBe(true);
  });

  it('returns true when retry first node is no longer codeBlock', () => {
    const original = { type: 'doc', content: [{ type: 'codeBlock' }] };
    const retry = { type: 'doc', content: [{ type: 'paragraph' }] };
    expect(isRicherParse(original, retry)).toBe(true);
  });

  it('returns false when retry is also a sole codeBlock', () => {
    const original = { type: 'doc', content: [{ type: 'codeBlock' }] };
    const retry = { type: 'doc', content: [{ type: 'codeBlock' }] };
    expect(isRicherParse(original, retry)).toBe(false);
  });

  it('returns false when retry has empty content', () => {
    const original = { type: 'doc', content: [{ type: 'codeBlock' }] };
    const retry = { type: 'doc', content: [] };
    expect(isRicherParse(original, retry)).toBe(false);
  });
});
