import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App error notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');

  it('routes startup and recent-item open failures through level2 notifications', () => {
    expect(source).toContain('const showLevel2AppError = useCallback(');
    expect(source).toContain("from '../services/error/level2Notification'");
    expect(source).toContain("from '../services/error/retryActions'");
    expect(source).toContain('showLevel2Notification({');
    expect(source).toContain('createRetryAction(');
    expect(source).toContain("'app-recent-workspace'");
    expect(source).toContain("'app-recent-file'");
    expect(source).toContain("'startup-file-open'");
    expect(source).toContain("t('file.openFailed')");
    expect(source).toContain("t('workspace.openRetrySuggestion')");
  });

  it('routes close-save failures through a level3 banner with a force-close action', () => {
    expect(source).toContain('const showCloseFailureBanner = useCallback(');
    expect(source).toContain("level: 'level3'");
    expect(source).toContain("source: 'window-close'");
    expect(source).toContain("label: t('close.closeAnyway')");
    expect(source).toContain('void getCurrentWindow().close();');
  });
});
