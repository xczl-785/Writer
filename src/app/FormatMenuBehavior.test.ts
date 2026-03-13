import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Format menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const formatCommandsTs = readFileSync(
    join(currentDir, 'commands', 'formatCommands.ts'),
    'utf-8',
  );

  it('emits editor commands for underline and highlight instead of todo placeholders', () => {
    expect(formatCommandsTs).toContain("emitEditorCommand('format.underline')");
    expect(formatCommandsTs).toContain("emitEditorCommand('format.highlight')");
    expect(formatCommandsTs).not.toContain("menu.format.underline', () => {");
    expect(formatCommandsTs).not.toContain("menu.format.highlight', () => {");
  });
});
