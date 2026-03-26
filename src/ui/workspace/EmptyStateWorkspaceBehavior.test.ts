import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('EmptyStateWorkspace behavior markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(currentDir, 'EmptyStateWorkspace.tsx'),
    'utf-8',
  );

  it('marks both primary actions as clickable buttons with pointer cursor styling', () => {
    expect(source).toContain('cursor-pointer');
  });

  it('passes all dropped native file-system paths upstream instead of only the first item', () => {
    expect(source).toContain('onDropItem?: (paths: string[]) => void;');
    expect(source).toContain('isDragOver?: boolean;');
    expect(source).toContain('const paths: string[] = [];');
    expect(source).toContain('onDropItem(paths);');
  });

  it('reuses the shared drag-drop hint presentation instead of inline overlay markup', () => {
    expect(source).toContain('DragDropHint');
    expect(source).toContain('<DragDropHint');
    expect(source).not.toContain(
      'pointer-events-none flex items-center justify-center bg-zinc-50/90',
    );
  });
});
