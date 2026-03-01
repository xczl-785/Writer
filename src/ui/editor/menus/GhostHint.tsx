/**
 * Ghost hint component for slash menu
 *
 * Shows a hint when cursor is at an empty line.
 */
export type GhostHintPosition = {
  open: boolean;
  x: number;
  y: number;
};

export type GhostHintProps = {
  position: GhostHintPosition;
};

export function GhostHint({ position }: GhostHintProps) {
  if (!position.open) return null;

  return (
    <div
      className={`editor-ghost-slash ${position.open ? 'is-open' : ''}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      / 输入以唤出菜单...
    </div>
  );
}
