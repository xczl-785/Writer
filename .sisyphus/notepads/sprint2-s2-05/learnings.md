# Learnings - S2-05 Delete Flow

## State Cleanup for Folders

When deleting a folder, it's critical to clean up all nested paths from the application state (open files, editor cache).
Implemented `removePath` helper in `workspaceSlice` and `editorSlice` that uses prefix matching (`path` or `path/`) to identify all affected files.

## UI Isolation

Used `e.stopPropagation()` on the delete button to prevent the `FileTreeNode`'s click handler (which opens/expands nodes) from firing when deleting.

## Hover Behavior

Followed the existing pattern of `opacity-0 group-hover:opacity-100` for the delete action to keep the UI clean while providing discoverable actions.
