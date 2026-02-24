import { EDITOR_CONFIG } from '../../../config/editor';

type Props = {
  isOpen: boolean;
  rows: string;
  cols: string;
  rowsInputRef: React.RefObject<HTMLInputElement | null>;
  onRowsChange: (value: string) => void;
  onColsChange: (value: string) => void;
  onRowsBlur: () => void;
  onColsBlur: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function InsertTablePopover({
  isOpen,
  rows,
  cols,
  rowsInputRef,
  onRowsChange,
  onColsChange,
  onRowsBlur,
  onColsBlur,
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Insert table"
      className="absolute left-0 top-full mt-2 z-20 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        }
      }}
    >
      <div className="text-xs font-medium text-gray-700">Insert table</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label
          htmlFor="insert-table-rows"
          className="flex flex-col gap-1 text-xs text-gray-700"
        >
          Rows
          <input
            ref={rowsInputRef}
            id="insert-table-rows"
            type="number"
            inputMode="numeric"
            min={EDITOR_CONFIG.table.minRows}
            max={EDITOR_CONFIG.table.maxRows}
            className="h-8 rounded border border-gray-200 px-2 text-sm"
            value={rows}
            onChange={(e) => onRowsChange(e.target.value)}
            onBlur={onRowsBlur}
          />
        </label>

        <label
          htmlFor="insert-table-cols"
          className="flex flex-col gap-1 text-xs text-gray-700"
        >
          Columns
          <input
            id="insert-table-cols"
            type="number"
            inputMode="numeric"
            min={EDITOR_CONFIG.table.minCols}
            max={EDITOR_CONFIG.table.maxCols}
            className="h-8 rounded border border-gray-200 px-2 text-sm"
            value={cols}
            onChange={(e) => onColsChange(e.target.value)}
            onBlur={onColsBlur}
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-8 rounded bg-gray-900 px-2 text-sm text-white"
          aria-label="Insert table"
          title="Insert table"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfirm}
        >
          Insert
        </button>
        <button
          type="button"
          className="h-8 rounded border border-gray-200 px-2 text-sm text-gray-800"
          aria-label="Cancel"
          title="Cancel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>

      <div className="mt-1 text-[10px] text-gray-500">
        Enter to insert, Esc to cancel
      </div>
    </div>
  );
}
