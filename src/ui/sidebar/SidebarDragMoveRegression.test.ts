import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const currentDir = __dirname;
const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

describe('Sidebar drag-move regression markers', () => {
  it('stores drop target state in a ref so document drop handlers can read the latest hover target', () => {
    expect(source).toContain('const dropStateRef = useRef(dropState);');
    expect(source).toContain('dropStateRef.current = next;');
    expect(source).toContain('const liveDropState =');
    expect(source).toContain('dropStateRef.current.dropTargetPath');
    expect(source).toContain('resolveDropStateFromNode(treeNode, ds)');
  });

  it('keeps document drag listeners independent from dropState updates', () => {
    expect(source).toContain(
      'const syncDropState = useCallback((next: DropState) => {',
    );
    expect(source).toContain('resolveDropStateFromNode,');
    expect(source).toContain('syncDropState,');
    expect(source).toContain('toggleNode,');
    expect(source).not.toContain(
      '}, [findTreeNode, toggleNode, dropState, showLevel2SidebarError]);',
    );
  });

  it('shows an explicit invalid-target message when drop stays inside the sidebar but no folder target resolves', () => {
    expect(source).toContain("setStatus('error', t('move.invalidTarget'))");
  });

  it('keeps visual feedback for file hover targets when they proxy to the parent directory drop target', () => {
    expect(source).toContain(
      'const [dragHoverState, setDragHoverState] = useState<DragHoverState>(',
    );
    expect(source).toContain(
      "dragHoverState.reason === 'file-parent-directory'",
    );
    expect(source).toContain("classes.push('bg-blue-50 ring-1 ring-blue-300')");
  });

  it('lets the resolved drop state drive file hover targets once they proxy to the parent directory', () => {
    expect(source).not.toContain(
      "if (resolvedHover.reason === 'file-target-disabled') {",
    );
    expect(source).toContain(
      'const nextDropState = resolveDropStateFromNode(treeNode, ds);',
    );
  });
});
