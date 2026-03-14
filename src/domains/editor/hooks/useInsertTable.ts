import type { Editor as TiptapEditor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EDITOR_CONFIG } from '../../../config/editor';

type UseInsertTableArgs = {
  setTransientStatus: (message: string) => void;
};

export function useInsertTable({ setTransientStatus }: UseInsertTableArgs) {
  const [isInsertTablePopoverOpen, setIsInsertTablePopoverOpen] =
    useState(false);
  const [insertTableRows, setInsertTableRows] = useState(
    String(EDITOR_CONFIG.table.defaultRows),
  );
  const [insertTableCols, setInsertTableCols] = useState(
    String(EDITOR_CONFIG.table.defaultCols),
  );
  const insertTableRowsInputRef = useRef<HTMLInputElement | null>(null);

  const clampTableDim = useCallback((value: string) => {
    const parsed = Number.parseInt(value, 10);
    const fallback = EDITOR_CONFIG.table.defaultRows;
    const min = EDITOR_CONFIG.table.minRows;
    const max = EDITOR_CONFIG.table.maxRows;
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }, []);

  const openInsertTablePopover = useCallback(() => {
    setInsertTableRows(String(EDITOR_CONFIG.table.defaultRows));
    setInsertTableCols(String(EDITOR_CONFIG.table.defaultCols));
    setIsInsertTablePopoverOpen(true);
  }, []);

  const closeInsertTablePopover = useCallback(() => {
    setIsInsertTablePopoverOpen(false);
  }, []);

  const confirmInsertTable = useCallback(
    (editor: TiptapEditor) => {
      const rows = clampTableDim(insertTableRows);
      const cols = clampTableDim(insertTableCols);
      setInsertTableRows(String(rows));
      setInsertTableCols(String(cols));

      const canInsert = editor
        .can()
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (!canInsert) {
        setTransientStatus('Insert table unavailable');
        return;
      }

      const inserted = editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (inserted) {
        setTransientStatus('Insert table');
        closeInsertTablePopover();
      }
    },
    [
      clampTableDim,
      closeInsertTablePopover,
      insertTableCols,
      insertTableRows,
      setTransientStatus,
    ],
  );

  useEffect(() => {
    if (!isInsertTablePopoverOpen) return;
    const timeout = setTimeout(() => {
      insertTableRowsInputRef.current?.focus();
      insertTableRowsInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timeout);
  }, [isInsertTablePopoverOpen]);

  return {
    isInsertTablePopoverOpen,
    insertTableRows,
    insertTableCols,
    insertTableRowsInputRef,
    setInsertTableRows,
    setInsertTableCols,
    clampTableDim,
    openInsertTablePopover,
    closeInsertTablePopover,
    confirmInsertTable,
  };
}
