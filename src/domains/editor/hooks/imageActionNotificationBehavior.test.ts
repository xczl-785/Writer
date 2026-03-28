import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('image action notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const imageActionSource = readFileSync(
    join(currentDir, 'imageActions.ts'),
    'utf-8',
  );
  const imagePasteSource = readFileSync(
    join(currentDir, 'useImagePaste.ts'),
    'utf-8',
  );

  it('routes image insertion failures through level2 notifications', () => {
    expect(imageActionSource).toContain('const showLevel2ImageError = (');
    expect(imageActionSource).toContain("level: 'level2'");
    expect(imageActionSource).toContain("'editor-insert-image-format'");
    expect(imageActionSource).toContain("'editor-insert-image-size'");
    expect(imageActionSource).toContain("'editor-insert-image-save'");
  });

  it('routes image paste validation failures through level2 notifications', () => {
    expect(imagePasteSource).toContain('const showLevel2PasteError = (');
    expect(imagePasteSource).toContain("level: 'level2'");
    expect(imagePasteSource).toContain("'editor-paste-image-format'");
    expect(imagePasteSource).toContain("'editor-paste-image-size'");
  });
});
