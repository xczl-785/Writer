import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, 'lib.rs'), 'utf-8');
const traySource = readFileSync(
  join(currentDir, 'quick_write_tray.rs'),
  'utf-8',
);
const shortcutSource = readFileSync(
  join(currentDir, 'quick_write_shortcut.rs'),
  'utf-8',
);
const defaultCapability = JSON.parse(
  readFileSync(resolve(currentDir, '../capabilities/default.json'), 'utf-8'),
) as { windows?: string[] };

describe('QuickWrite new window native command', () => {
  it('opens a fresh QuickWrite window instead of reusing the main window', () => {
    expect(source).toContain('fn open_quick_write_window');
    expect(source).toContain(
      'quick_write_tray::open_quick_write_new_draft_window(&app)',
    );
    expect(traySource).toContain(
      'const QUICK_WRITE_NEW_DRAFT_URL: &str = "quick-write.html?newDraft=1"',
    );
    expect(traySource).toContain(
      'let label = format!("{QUICK_WRITE_WINDOW_LABEL_PREFIX}{timestamp}")',
    );
    expect(traySource).toContain('WebviewWindowBuilder::new(');
    expect(traySource).toContain('label,');
    expect(traySource).toContain(
      'WebviewUrl::App(QUICK_WRITE_NEW_DRAFT_URL.into())',
    );
    expect(traySource).toContain('.title(QUICK_WRITE_WINDOW_TITLE)');
    expect(traySource).not.toContain(
      'WebviewWindowBuilder::new(app, QUICK_WRITE_MAIN_WINDOW_LABEL, WebviewUrl::App(QUICK_WRITE_NEW_DRAFT_URL.into()))',
    );
  });

  it('registers the command for front-end runtime invocation', () => {
    expect(source).toContain('open_quick_write_window,');
  });

  it('grants IPC capability to the main and dynamic QuickWrite windows only', () => {
    expect(defaultCapability.windows).toEqual(['main', 'quick-write-*']);
    expect(defaultCapability.windows).toContain('main');
    expect(defaultCapability.windows).toContain('quick-write-*');
    expect(defaultCapability.windows).not.toContain('*');
  });

  it('shows and focuses an existing QuickWrite window before creating the main window fallback', () => {
    expect(traySource).toContain('pub fn show_or_open_quick_write_window');
    expect(traySource).toContain(
      '.get_webview_window(QUICK_WRITE_MAIN_WINDOW_LABEL)',
    );
    expect(traySource).toContain(
      'label.starts_with(QUICK_WRITE_WINDOW_LABEL_PREFIX)',
    );
    expect(traySource).toContain('window.unminimize()');
    expect(traySource).toContain('window.show()');
    expect(traySource).toContain('window.set_focus()');
    expect(traySource).toContain('WebviewWindowBuilder::new(');
    expect(traySource).toContain('QUICK_WRITE_MAIN_WINDOW_LABEL');
    expect(traySource).toContain('WebviewUrl::App(QUICK_WRITE_URL.into())');
    expect(traySource).toContain(
      'const QUICK_WRITE_URL: &str = "quick-write.html"',
    );
  });

  it('routes macOS file-open events to the focused webview window before app fallback', () => {
    expect(source).toContain(
      'const FILE_OPEN_EVENT: &str = "writer:file-open"',
    );
    expect(source).toContain('fn emit_file_open_event');
    expect(source).toContain(
      'menu::emit_to_focused_webview_window_or_app(app, FILE_OPEN_EVENT, file_path);',
    );
    expect(source).not.toContain('app.emit(FILE_OPEN_EVENT, file_path)');
  });

  it('routes the QuickWrite global shortcut to a new draft window without blocking startup on failure', () => {
    expect(shortcutSource).toContain('use tauri_plugin_global_shortcut');
    expect(shortcutSource).toContain('ShortcutState::Pressed');
    expect(shortcutSource).toContain(
      'quick_write_tray::open_quick_write_new_draft_window(app)',
    );
    expect(shortcutSource).toContain(
      'QuickWrite global shortcut plugin init failed',
    );
    expect(shortcutSource).toContain(
      'QuickWrite global shortcut registration failed',
    );
    expect(shortcutSource).toContain(
      'QuickWrite global shortcut action failed',
    );
    expect(shortcutSource).not.toContain('Result<(), tauri::Error>');
    expect(shortcutSource).not.toContain('?;');
  });

  it('initializes release logging before QuickWrite global shortcut registration', () => {
    const logPluginIndex = source.indexOf(
      'tauri_plugin_log::Builder::default()',
    );
    const shortcutRegistrationIndex = source.indexOf(
      'quick_write_shortcut::register_quick_write_global_shortcut(&app.handle());',
    );

    expect(logPluginIndex).toBeGreaterThan(-1);
    expect(shortcutRegistrationIndex).toBeGreaterThan(-1);
    expect(logPluginIndex).toBeLessThan(shortcutRegistrationIndex);
    expect(source).not.toContain('cfg!(debug_assertions)');
    expect(source).not.toContain('#[cfg(debug_assertions)]');
  });
});
