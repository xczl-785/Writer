import { describe, expect, test } from 'vitest';
import {
  normalizePath,
  getParentPath,
  joinPath,
  isChildPath,
  isPathMatch,
  getRelativePath,
  splitPath,
  getBasename,
  getFileExtension,
  isMarkdownFile,
  trimTrailingSeparator,
  ensureTrailingSlash,
} from './pathUtils';

describe('normalizePath', () => {
  test('Unix path unchanged', () => {
    expect(normalizePath('/Users/docs/note.md')).toBe('/Users/docs/note.md');
  });

  test('Windows path converted to Unix style', () => {
    expect(normalizePath('C:\\Users\\docs\\note.md')).toBe(
      'C:/Users/docs/note.md',
    );
  });

  test('Mixed separators normalized', () => {
    expect(normalizePath('C:\\Users/docs\\note.md')).toBe(
      'C:/Users/docs/note.md',
    );
  });

  test('Relative path with backslash', () => {
    expect(normalizePath('docs\\note.md')).toBe('docs/note.md');
  });
});

describe('getParentPath', () => {
  test('Unix path', () => {
    expect(getParentPath('/Users/docs/note.md')).toBe('/Users/docs');
  });

  test('Windows path', () => {
    expect(getParentPath('C:\\Users\\docs\\note.md')).toBe('C:/Users/docs');
  });

  test('Root path returns empty', () => {
    expect(getParentPath('/note.md')).toBe('');
  });

  test('Single component returns empty', () => {
    expect(getParentPath('note.md')).toBe('');
  });

  test('UNC path', () => {
    expect(getParentPath('\\\\server\\share\\docs\\note.md')).toBe(
      '//server/share/docs',
    );
  });
});

describe('joinPath', () => {
  test('Multiple segments', () => {
    expect(joinPath('C:/Users', 'docs', 'note.md')).toBe(
      'C:/Users/docs/note.md',
    );
  });

  test('Handles leading and trailing slashes', () => {
    expect(joinPath('/Users/', '/docs/', 'note.md')).toBe(
      '/Users/docs/note.md',
    );
  });

  test('Filters empty segments', () => {
    expect(joinPath('Users', '', 'docs', 'note.md')).toBe('Users/docs/note.md');
  });

  test('Empty result for all empty', () => {
    expect(joinPath('', '', '')).toBe('');
  });
});

describe('isChildPath', () => {
  test('Direct child', () => {
    expect(isChildPath('/Users/docs', '/Users/docs/note.md')).toBe(true);
  });

  test('Nested child', () => {
    expect(isChildPath('/Users', '/Users/docs/note.md')).toBe(true);
  });

  test('Not a child', () => {
    expect(isChildPath('/Users/docs', '/Users/other/note.md')).toBe(false);
  });

  test('Same path is not child', () => {
    expect(isChildPath('/Users/docs', '/Users/docs')).toBe(false);
  });

  test('Windows style paths', () => {
    expect(isChildPath('C:\\Users\\docs', 'C:\\Users\\docs\\note.md')).toBe(
      true,
    );
  });

  test('Mixed separator paths', () => {
    expect(isChildPath('C:/Users/docs', 'C:\\Users\\docs\\note.md')).toBe(true);
  });
});

describe('isPathMatch', () => {
  test('Exact match', () => {
    expect(isPathMatch('/Users/docs/note.md', '/Users/docs/note.md')).toBe(
      true,
    );
  });

  test('Child path matches', () => {
    expect(isPathMatch('/Users/docs', '/Users/docs/note.md')).toBe(true);
  });

  test('Non-matching path', () => {
    expect(isPathMatch('/Users/docs', '/Users/other/note.md')).toBe(false);
  });

  test('Windows style paths', () => {
    expect(isPathMatch('C:\\Users\\docs', 'C:\\Users\\docs\\note.md')).toBe(
      true,
    );
  });
});

describe('getRelativePath', () => {
  test('Same directory', () => {
    expect(
      getRelativePath('/Users/docs/note.md', '/Users/docs/image.png'),
    ).toBe('./image.png');
  });

  test('Child directory', () => {
    expect(
      getRelativePath('/Users/docs/note.md', '/Users/docs/assets/image.png'),
    ).toBe('./assets/image.png');
  });

  test('Parent directory', () => {
    expect(
      getRelativePath('/Users/docs/notes/note.md', '/Users/docs/image.png'),
    ).toBe('../image.png');
  });

  test('Sibling directory', () => {
    expect(
      getRelativePath(
        '/Users/docs/notes/note.md',
        '/Users/docs/assets/image.png',
      ),
    ).toBe('../assets/image.png');
  });

  test('Windows style paths', () => {
    expect(
      getRelativePath('C:\\Users\\docs\\note.md', 'C:\\Users\\docs\\image.png'),
    ).toBe('./image.png');
  });
});

describe('splitPath', () => {
  test('Unix path', () => {
    expect(splitPath('/Users/docs/note.md')).toEqual([
      'Users',
      'docs',
      'note.md',
    ]);
  });

  test('Windows path', () => {
    expect(splitPath('C:\\Users\\docs\\note.md')).toEqual([
      'C:',
      'Users',
      'docs',
      'note.md',
    ]);
  });

  test('Relative path', () => {
    expect(splitPath('docs/note.md')).toEqual(['docs', 'note.md']);
  });

  test('Empty path', () => {
    expect(splitPath('')).toEqual([]);
  });
});

describe('getBasename', () => {
  test('File with extension', () => {
    expect(getBasename('/Users/docs/note.md')).toBe('note.md');
  });

  test('Directory', () => {
    expect(getBasename('/Users/docs')).toBe('docs');
  });

  test('Windows path', () => {
    expect(getBasename('C:\\Users\\docs\\note.md')).toBe('note.md');
  });
});

describe('getFileExtension', () => {
  test('Markdown file', () => {
    expect(getFileExtension('note.md')).toBe('.md');
  });

  test('Multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
  });

  test('No extension', () => {
    expect(getFileExtension('README')).toBe('');
  });

  test('Hidden file', () => {
    expect(getFileExtension('.gitignore')).toBe('');
  });

  test('Trailing dot', () => {
    expect(getFileExtension('file.')).toBe('');
  });
});

describe('isMarkdownFile', () => {
  test('.md file', () => {
    expect(isMarkdownFile('note.md')).toBe(true);
  });

  test('.markdown file', () => {
    expect(isMarkdownFile('note.markdown')).toBe(true);
  });

  test('.mdx file', () => {
    expect(isMarkdownFile('note.mdx')).toBe(true);
  });

  test('Case insensitive', () => {
    expect(isMarkdownFile('note.MD')).toBe(true);
  });

  test('Non-markdown file', () => {
    expect(isMarkdownFile('note.txt')).toBe(false);
  });
});

describe('trimTrailingSeparator', () => {
  test('Trailing slash removed', () => {
    expect(trimTrailingSeparator('/Users/docs/')).toBe('/Users/docs');
  });

  test('Multiple trailing slashes removed', () => {
    expect(trimTrailingSeparator('/Users/docs///')).toBe('/Users/docs');
  });

  test('Windows trailing backslash normalized and removed', () => {
    expect(trimTrailingSeparator('C:\\Users\\docs\\')).toBe('C:/Users/docs');
  });

  test('No trailing separator unchanged', () => {
    expect(trimTrailingSeparator('/Users/docs')).toBe('/Users/docs');
  });

  test('Root path unchanged', () => {
    expect(trimTrailingSeparator('/')).toBe('/');
  });
});

describe('ensureTrailingSlash', () => {
  test('Adds trailing slash', () => {
    expect(ensureTrailingSlash('/Users/docs')).toBe('/Users/docs/');
  });

  test('Already has trailing slash', () => {
    expect(ensureTrailingSlash('/Users/docs/')).toBe('/Users/docs/');
  });

  test('Windows path normalized and slash added', () => {
    expect(ensureTrailingSlash('C:\\Users\\docs')).toBe('C:/Users/docs/');
  });
});
