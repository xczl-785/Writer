# Design Doc: Delete Whole Table Control

## 1. Goal

Add an explicit "Delete table" entry in the existing table floating controls in the editor.

## 2. Approach

- Add `deleteTable` to `ToolbarCommandId` and `TOOLBAR_COMMANDS` in `src/ui/editor/Editor.tsx`.
- Use TipTap's `deleteTable()` command.
- Append the button to the table controls group in the toolbar.
- Label: `Del Tbl`, Aria-label: `Delete table`.

## 3. Implementation Details

- **Command Spec**:
  ```typescript
  {
    id: 'deleteTable',
    label: 'Del Tbl',
    ariaLabel: 'Delete table',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteTable().run(),
    run: (editor) => editor.chain().focus().deleteTable().run(),
  }
  ```
- **UI**: The button will appear alongside `+R`, `-R`, `+C`, `-C`.

## 4. Testing

- Create `src/ui/editor/EditorTableControls.test.ts`.
- Assert `Editor.tsx` contains `aria-label="Delete table"` and the `deleteTable` command ID.

## 5. Verification

- `npm run test`
