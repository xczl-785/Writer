/**
 * Dialog Module
 *
 * Reusable dialog components for V5.
 *
 * @see docs/current/UI/UI_UX规范.md
 */

export { showConfirmDialog, showDeleteConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogOptions } from './ConfirmDialog';

export { showWorkspaceLockDialog } from './WorkspaceLockDialog';
export type {
  WorkspaceLockDialogOptions,
  WorkspaceLockDialogResult,
} from './WorkspaceLockDialog';
