import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, 'menu.rs'), 'utf-8');
const traySource = readFileSync(
  join(currentDir, 'quick_write_tray.rs'),
  'utf-8',
);
const shortcutSource = readFileSync(
  join(currentDir, 'quick_write_shortcut.rs'),
  'utf-8',
);
const libSource = readFileSync(join(currentDir, 'lib.rs'), 'utf-8');
const cargoToml = readFileSync(resolve(currentDir, '../Cargo.toml'), 'utf-8');

const quickWriteBuilder = source.slice(
  source.indexOf('fn build_quick_write_native_menu_with_locale'),
  source.indexOf('pub fn emit_menu_command'),
);

describe('QuickWrite native menu behavior', () => {
  it('detects QuickWrite from Tauri config flavor markers', () => {
    expect(source).toContain('enum AppFlavor');
    expect(source).toContain('config.identifier == "com.writer.quickwrite"');
    expect(source).toContain('product_name == "Writer QuickWrite"');
    expect(source).toContain('window.url.to_string() == "quick-write.html"');
    expect(source).toContain('pub fn is_quick_write_flavor');
    expect(source).toContain(
      'AppFlavor::QuickWrite => build_quick_write_native_menu_with_locale',
    );
  });

  it('registers a built-in Tauri tray only for QuickWrite flavor', () => {
    expect(cargoToml).toContain('"tray-icon"');
    expect(libSource).toContain('pub mod quick_write_tray;');
    expect(libSource).toContain(
      'quick_write_tray::register_quick_write_tray(&app.handle())?',
    );
    expect(traySource).toContain('use tauri::tray::TrayIconBuilder');
    expect(traySource).toContain('pub fn register_quick_write_tray');
    expect(traySource).toContain('if !menu::is_quick_write_flavor(app)');
    expect(traySource).toContain('return Ok(())');
    expect(traySource).toContain('TrayIconBuilder::with_id');
    expect(traySource).toContain('QUICK_WRITE_TRAY_ID');
  });

  it('registers the global shortcut only for QuickWrite flavor', () => {
    expect(cargoToml).toContain('tauri-plugin-global-shortcut');
    expect(libSource).toContain('pub mod quick_write_shortcut;');
    expect(libSource).toContain(
      'quick_write_shortcut::register_quick_write_global_shortcut(&app.handle());',
    );
    expect(shortcutSource).toContain(
      'const QUICK_WRITE_NEW_DRAFT_SHORTCUT: &str = "CommandOrControl+Shift+N"',
    );
    expect(shortcutSource).toContain(
      'pub fn register_quick_write_global_shortcut',
    );
    expect(shortcutSource).toContain('if !menu::is_quick_write_flavor(app)');
    expect(shortcutSource).toContain('return;');
    expect(shortcutSource).toContain(
      'tauri_plugin_global_shortcut::Builder::new().build()',
    );
    expect(shortcutSource).toContain('.on_shortcut(');
  });

  it('builds the required QuickWrite tray menu without workspace commands', () => {
    expect(traySource).toContain(
      'const QUICK_WRITE_TRAY_SHOW_ID: &str = "tray.quick_write.show"',
    );
    expect(traySource).toContain(
      'const QUICK_WRITE_TRAY_NEW_DRAFT_ID: &str = "tray.quick_write.new_draft"',
    );
    expect(traySource).toContain(
      'const QUICK_WRITE_TRAY_EXIT_ID: &str = "tray.quick_write.exit"',
    );
    expect(traySource).toContain('"显示随手写"');
    expect(traySource).toContain('"新想法"');
    expect(traySource).toContain('"退出"');
    expect(traySource).not.toContain('menu.file.open_workspace');
    expect(traySource).not.toContain('menu.file.open_recent');
    expect(traySource).not.toContain('menu.file.add_folder_to_workspace');
  });

  it('routes tray commands to native QuickWrite window actions and app exit', () => {
    expect(traySource).toContain('handle_quick_write_tray_menu_event');
    expect(traySource).toContain('QUICK_WRITE_TRAY_SHOW_ID =>');
    expect(traySource).toContain('show_or_open_quick_write_window(app)');
    expect(traySource).toContain('QUICK_WRITE_TRAY_NEW_DRAFT_ID =>');
    expect(traySource).toContain('open_quick_write_new_draft_window(app)');
    expect(traySource).toContain('QUICK_WRITE_TRAY_EXIT_ID => app.exit(0)');
    expect(traySource).not.toContain('emit_menu_command');
  });

  it('contains only QuickWrite file commands and bridge-compatible editor commands', () => {
    expect(quickWriteBuilder).toContain('"menu.quick_write.open_file"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.save_to"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.new_window"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.close"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_undo"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_cut"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_copy"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_paste"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_select_all"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_find"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.edit_replace"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.format_bold"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.format_italic"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.format_link"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.paragraph_body"');
    expect(quickWriteBuilder).toContain('"menu.quick_write.paragraph_heading"');
    expect(quickWriteBuilder).toContain(
      '"menu.quick_write.paragraph_bulleted_list"',
    );
    expect(quickWriteBuilder).toContain(
      '"menu.quick_write.paragraph_numbered_list"',
    );
    expect(quickWriteBuilder).toContain('"menu.quick_write.paragraph_table"');
  });

  it('omits workspace and sidebar native command ids', () => {
    const blockedIds = [
      '"menu.file.open_folder"',
      '"menu.file.open_workspace"',
      '"menu.file.open_recent"',
      '"menu.file.add_folder_to_workspace"',
      '"menu.file.save_workspace"',
      '"menu.file.save_workspace_as"',
      '"menu.file.export_pdf"',
      '"menu.quick_write.export_html"',
      '"menu.quick_write.print_to_pdf"',
      '"menu.file.close_folder"',
      '"menu.file.close_workspace"',
      '"menu.edit.find"',
      '"menu.edit.replace"',
      '"menu.format.link"',
      '"menu.paragraph.table"',
      '"menu.view.toggle_sidebar"',
      '"menu.view.outline"',
    ];

    for (const id of blockedIds) {
      expect(quickWriteBuilder).not.toContain(id);
    }
  });

  it('routes native menu commands to the focused webview window before app fallback', () => {
    expect(source).toContain('pub fn emit_to_focused_webview_window_or_app');
    expect(source).toContain('.webview_windows()');
    expect(source).toContain(
      '.find(|window| window.is_focused().unwrap_or(false))',
    );
    expect(source).toContain('window.emit(event, payload.clone())');
    expect(source).toContain('app.emit(event, payload)');
    expect(source).toContain(
      'emit_to_focused_webview_window_or_app(app, "writer://menu-command", payload);',
    );
    expect(source).not.toContain('app.emit("writer://menu-command", payload)');
  });
});
