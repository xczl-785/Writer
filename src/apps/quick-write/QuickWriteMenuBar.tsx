import {
  quickWriteMenuSchema,
  type QuickWriteMenuCommand,
  type QuickWriteMenuGroup,
} from './quickWriteMenu';

interface QuickWriteMenuBarProps {
  disabledCommands?: Partial<Record<QuickWriteMenuCommand, string>>;
  menuGroups?: QuickWriteMenuGroup[];
  onCommand(command: QuickWriteMenuCommand): void;
}

export function QuickWriteMenuBar({
  disabledCommands = {},
  menuGroups = quickWriteMenuSchema,
  onCommand,
}: QuickWriteMenuBarProps) {
  return (
    <nav aria-label="QuickWrite menu" className="quick-write-menu-bar">
      {menuGroups.map((group) => (
        <div className="quick-write-menu-group" key={group.id}>
          <span className="quick-write-menu-label">{group.label}</span>
          <div className="quick-write-menu-items">
            {group.items.map((item) => {
              const disabledReason =
                disabledCommands[item.command] ?? item.disabledReason;
              const isDisabled = Boolean(disabledReason);
              return (
                <button
                  aria-label={`${group.label}: ${item.label}`}
                  className="quick-write-menu-item"
                  disabled={isDisabled}
                  key={item.command}
                  title={disabledReason ?? item.label}
                  type="button"
                  onClick={() => onCommand(item.command)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
