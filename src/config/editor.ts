export const EDITOR_CONFIG = {
  autosave: {
    debounceMs: 800,
  },
  table: {
    minRows: 1,
    maxRows: 20,
    minCols: 1,
    maxCols: 20,
    defaultRows: 3,
    defaultCols: 3,
  },
  findReplace: {
    maxMatches: 1000,
  },
  status: {
    transientTimeoutMs: 1500,
  },
  image: {
    maxUploadBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    assetsDirName: '.assets',
  },
} as const;
