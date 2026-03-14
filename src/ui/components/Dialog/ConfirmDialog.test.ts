import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('ConfirmDialog safety contract', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'ConfirmDialog.ts'), 'utf-8');

  it('uses custom web dialog instead of tauri ask', () => {
    expect(source).not.toContain('@tauri-apps/plugin-dialog');
    expect(source).not.toContain('ask(');
    expect(source).toContain("setAttribute('role', 'alertdialog')");
  });

  it('focuses cancel button by default and keeps enter safe by default', () => {
    expect(source).toContain('cancelButton.focus()');
    expect(source).toContain("if (event.key === 'Enter')");
    expect(source).toContain('if (active === okButton)');
    expect(source).toContain('close(false);');
  });
});
