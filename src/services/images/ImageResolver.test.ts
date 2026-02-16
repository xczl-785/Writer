import { describe, it, expect, vi } from 'vitest';
import { ImageResolver } from './ImageResolver';

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

describe('ImageResolver', () => {
  describe('resolve', () => {
    it('should return same URL for http/https', () => {
      expect(ImageResolver.resolve('http://example.com/img.png', null)).toBe(
        'http://example.com/img.png',
      );
      expect(ImageResolver.resolve('https://example.com/img.png', null)).toBe(
        'https://example.com/img.png',
      );
    });

    it('should return same URL for data/blob/asset', () => {
      expect(ImageResolver.resolve('data:image/png;base64,xxx', null)).toBe(
        'data:image/png;base64,xxx',
      );
      expect(ImageResolver.resolve('blob:http://localhost/xxx', null)).toBe(
        'blob:http://localhost/xxx',
      );
      expect(ImageResolver.resolve('asset://localhost/xxx', null)).toBe(
        'asset://localhost/xxx',
      );
    });

    it('should convert absolute paths', () => {
      expect(ImageResolver.resolve('/absolute/path/img.png', null)).toBe(
        'asset:///absolute/path/img.png',
      );
      expect(ImageResolver.resolve('C:\\absolute\\path\\img.png', null)).toBe(
        'asset://C:\\absolute\\path\\img.png',
      );
    });

    it('should resolve relative paths based on active file', () => {
      const activeFile = '/Users/user/docs/note.md';
      expect(ImageResolver.resolve('./assets/img.png', activeFile)).toBe(
        'asset:///Users/user/docs/assets/img.png',
      );
      expect(ImageResolver.resolve('../images/img.png', activeFile)).toBe(
        'asset:///Users/user/images/img.png',
      );
    });

    it('should handle Windows-style relative paths', () => {
      const activeFile = 'C:\\Users\\user\\docs\\note.md';
      expect(ImageResolver.resolve('.\\assets\\img.png', activeFile)).toBe(
        'asset://C:/Users/user/docs/assets/img.png',
      );
    });

    it('should return original src if active file is missing for relative path', () => {
      expect(ImageResolver.resolve('./assets/img.png', null)).toBe(
        './assets/img.png',
      );
    });
  });

  describe('join', () => {
    it('should join paths correctly', () => {
      expect(ImageResolver.join('/a/b', 'c')).toBe('/a/b/c');
      expect(ImageResolver.join('/a/b', './c')).toBe('/a/b/c');
      expect(ImageResolver.join('/a/b', '../c')).toBe('/a/c');
      expect(ImageResolver.join('/a/b', '../../c')).toBe('/c');
    });

    it('should handle Windows paths in join', () => {
      expect(ImageResolver.join('C:\\a\\b', 'assets\\img.png')).toBe(
        'C:/a/b/assets/img.png',
      );
    });
  });
});
