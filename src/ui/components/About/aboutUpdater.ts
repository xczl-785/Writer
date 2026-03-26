import { check, type Update } from '@tauri-apps/plugin-updater';

const RELEASES_URL = 'https://github.com/xczl-785/Writer/releases/latest';

export type AvailableAppUpdate = {
  kind: 'available';
  update: Update;
  currentVersion: string;
  version: string;
  notes: string | null;
  publishedAt: string | null;
  releaseUrl: string;
};

export type AppUpdateResult = AvailableAppUpdate | { kind: 'none' };

export type UpdateProgress =
  | { phase: 'downloading'; percent: number | null }
  | { phase: 'installing'; percent: number | null };

export async function checkForAppUpdate(): Promise<AppUpdateResult> {
  const update = await check();
  if (!update) {
    return { kind: 'none' };
  }

  return {
    kind: 'available',
    update,
    currentVersion: update.currentVersion,
    version: update.version,
    notes: update.body ?? null,
    publishedAt: update.date ?? null,
    releaseUrl: RELEASES_URL,
  };
}

export async function installAppUpdate(
  appUpdate: AvailableAppUpdate,
  onProgress: (progress: UpdateProgress) => void,
): Promise<void> {
  let totalBytes = 0;
  let downloadedBytes = 0;

  try {
    await appUpdate.update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        totalBytes = event.data.contentLength ?? 0;
        downloadedBytes = 0;
        onProgress({
          phase: 'downloading',
          percent: totalBytes > 0 ? 0 : null,
        });
        return;
      }

      if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength;
        const percent =
          totalBytes > 0
            ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            : null;
        onProgress({ phase: 'downloading', percent });
        return;
      }

      onProgress({ phase: 'installing', percent: 100 });
    });
  } finally {
    await appUpdate.update.close().catch(() => {});
  }
}

export function openReleasePage(url: string = RELEASES_URL): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
