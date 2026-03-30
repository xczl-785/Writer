import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtualizedFileTree } from './VirtualizedFileTree';
import { useStatusStore } from '../../../state/slices/statusSlice';
import type { VirtualizedTreeProps } from './types';
import { getSidebarErrorMeta } from '../../sidebar/sidebarErrorCatalog';
import { createStatusState } from '../../../test/helpers/statusStoreMocks';

const { renamePathMock, flushAffectedFilesMock } = vi.hoisted(() => ({
  renamePathMock: vi.fn(),
  flushAffectedFilesMock: vi.fn(),
}));

vi.mock('react-window', () => ({
  List: ({ rowComponent: RowComponent, rowCount, rowProps }: any) =>
    createElement(
      'div',
      {},
      Array.from({ length: rowCount }, (_, index) =>
        createElement(RowComponent, {
          key: index,
          index,
          style: {},
          ariaAttributes: {
            'aria-posinset': index + 1,
            'aria-setsize': rowCount,
            role: 'listitem',
          },
          ...rowProps,
        }),
      ),
    ),
}));

vi.mock('../../../domains/file/services/fileActions', () => ({
  fileActions: {
    renamePath: renamePathMock,
  },
}));

vi.mock('../../../domains/file/services/FsSafety', () => ({
  FsSafety: {
    flushAffectedFiles: flushAffectedFilesMock,
  },
}));

vi.mock('../../../domains/workspace/services/workspaceActions', () => ({
  workspaceActions: {
    openFile: vi.fn(() => Promise.resolve()),
  },
}));

function renderTree(props: VirtualizedTreeProps & { onShowLevel2Error: any }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(VirtualizedFileTree, props));
  });

  return { container, root };
}

async function cleanup(container: HTMLElement, root: Root) {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

function changeInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('VirtualizedFileTree failure handling', () => {
  beforeEach(() => {
    renamePathMock.mockReset();
    flushAffectedFilesMock.mockReset();
    useStatusStore.setState(createStatusState());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('routes rename blur failures through the shared level2 error callback', async () => {
    flushAffectedFilesMock.mockResolvedValueOnce(true);
    renamePathMock.mockRejectedValueOnce(new Error('Access denied'));
    const onShowLevel2Error = vi.fn();

    const { container, root } = renderTree({
      flattenedNodes: [
        {
          id: '/ws/note.md',
          node: { path: '/ws/note.md', name: 'note.md', type: 'file' },
          depth: 0,
          rootPath: '/ws',
          isExpanded: false,
          hasChildren: false,
        },
      ],
      containerHeight: 300,
      selectedPath: '/ws/note.md',
      activeFile: null,
      renamingPath: '/ws/note.md',
      renameTrigger: 1,
      ghostNode: null,
      onToggleExpand: vi.fn(),
      onSelect: vi.fn(),
      onOpenContextMenu: vi.fn(),
      onGhostCommit: vi.fn(),
      onGhostCancel: vi.fn(),
      onRequestRenameStart: vi.fn(),
      onRequestRenameEnd: vi.fn(),
      onShowLevel2Error,
    });

    await act(async () => {
      await Promise.resolve();
    });

    const renameInput = container.querySelector(
      'input',
    ) as HTMLInputElement | null;
    expect(renameInput).toBeDefined();

    changeInputValue(renameInput!, 'renamed');

    await act(async () => {
      renameInput?.focus();
      renameInput?.blur();
      await Promise.resolve();
    });

    const renameError = getSidebarErrorMeta('rename');
    expect(onShowLevel2Error).toHaveBeenCalledWith(
      expect.any(Error),
      renameError.source,
      renameError.reason,
      renameError.suggestion,
    );

    await cleanup(container, root);
  });
});
