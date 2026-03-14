import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('watcher state integration markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const libRs = readFileSync(join(currentDir, 'lib.rs'), 'utf-8');
  const watcherRs = readFileSync(join(currentDir, 'watcher.rs'), 'utf-8');

  it('uses the same managed mutex type for watcher state in lib and commands', () => {
    expect(libRs).toContain('use std::sync::Mutex;');
    expect(libRs).toContain('.manage(Mutex::new(WatcherState::default()));');
    expect(watcherRs).toContain("state: State<'_, Mutex<WatcherState>>");
  });
});
