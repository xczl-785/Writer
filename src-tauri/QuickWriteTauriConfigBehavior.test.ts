import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type TauriWindowConfig = {
  height?: number;
  minHeight?: number;
  minWidth?: number;
  title?: string;
  url?: string;
  width?: number;
};

type TauriBundleConfig = {
  active?: boolean;
  createUpdaterArtifacts?: boolean;
  fileAssociations?: unknown;
  icon?: string[];
  targets?: string | string[];
};

type TauriConfig = {
  productName?: string;
  identifier?: string;
  app?: {
    windows?: TauriWindowConfig[];
  };
  bundle?: TauriBundleConfig;
  plugins?: Record<string, unknown>;
};

const currentDir = dirname(fileURLToPath(import.meta.url));

function readConfig(fileName: string): TauriConfig {
  return JSON.parse(
    readFileSync(join(currentDir, fileName), 'utf-8'),
  ) as TauriConfig;
}

describe('QuickWrite Tauri config overlay', () => {
  const writerConfig = readConfig('tauri.conf.json');
  const quickWriteConfig = readConfig('tauri.quick-write.conf.json');

  it('uses separate product metadata from the Writer shell', () => {
    expect(writerConfig.productName).toBe('Writer');
    expect(writerConfig.identifier).toBe('com.writer.app');

    expect(quickWriteConfig.productName).toBe('Writer QuickWrite');
    expect(quickWriteConfig.identifier).toBe('com.writer.quickwrite');
    expect(quickWriteConfig.productName).not.toBe(writerConfig.productName);
    expect(quickWriteConfig.identifier).not.toBe(writerConfig.identifier);
  });

  it('opens the QuickWrite entry instead of the Writer entry', () => {
    const writerWindow = writerConfig.app?.windows?.[0];
    const quickWriteWindow = quickWriteConfig.app?.windows?.[0];

    expect(writerWindow?.title).toBe('Writer');
    expect(writerWindow?.url).toBeUndefined();

    expect(quickWriteWindow?.title).toBe('Writer QuickWrite');
    expect(quickWriteWindow?.url).toBe('quick-write.html');
    expect(quickWriteWindow?.url).not.toBe('index.html');
    expect(quickWriteWindow?.width).toBe(860);
    expect(quickWriteWindow?.height).toBe(620);
    expect(quickWriteWindow?.minWidth).toBe(420);
    expect(quickWriteWindow?.minHeight).toBe(360);
  });

  it('keeps bundle identity explicit while reusing the Writer icon set', () => {
    const writerBundle = writerConfig.bundle;
    const quickWriteBundle = quickWriteConfig.bundle;

    expect(quickWriteBundle?.active).toBe(true);
    expect(quickWriteBundle?.targets).toBe('all');
    expect(quickWriteBundle?.icon).toEqual(writerBundle?.icon);
    expect(quickWriteBundle?.icon).toEqual([
      'icons/32x32.png',
      'icons/128x128.png',
      'icons/128x128@2x.png',
      'icons/icon.icns',
      'icons/icon.ico',
    ]);

    for (const iconPath of quickWriteBundle?.icon ?? []) {
      expect(existsSync(join(currentDir, iconPath))).toBe(true);
    }
  });

  it('does not claim Writer file associations or release channels in the QuickWrite overlay', () => {
    expect(writerConfig.bundle?.fileAssociations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ext: ['md'],
          name: 'Writer',
        }),
      ]),
    );

    expect(quickWriteConfig.bundle?.fileAssociations).toBeNull();
    expect(quickWriteConfig.bundle?.createUpdaterArtifacts).toBe(false);
    expect(quickWriteConfig.plugins?.updater).toBeUndefined();
  });
});
