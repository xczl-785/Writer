export type RecoveryDraftJsonValue =
  | null
  | boolean
  | number
  | string
  | RecoveryDraftJsonValue[]
  | { [key: string]: RecoveryDraftJsonValue };

export type RecoveryDraftStatus = 'active' | 'promoted' | 'abandoned';

export interface RecoveryDraftEditorSelectionState {
  anchor: number;
  head: number;
  updatedAt: number;
}

export interface RecoveryDraftEditorState {
  selection?: RecoveryDraftEditorSelectionState;
  scrollTop?: number;
}

export interface RecoveryDraftMetadata {
  schemaVersion: 1;
  draftId: string;
  recoveryPath: string;
  status: RecoveryDraftStatus;
  updatedAt: number;
  displayLabel: string;
  sourcePath?: string | null;
  contentVersion?: number;
  promotedAt?: number;
  editorState?: RecoveryDraftEditorState;
}

export interface RecoveryDraftIndexFile {
  schemaVersion: 1;
  drafts: RecoveryDraftMetadata[];
}

export interface RecoveryDraftStoragePorts {
  readFile(path: string): Promise<string>;
  writeFileAtomic(path: string, content: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  readJsonFile(path: string): Promise<RecoveryDraftJsonValue>;
  writeJsonFile(path: string, data: RecoveryDraftJsonValue): Promise<void>;
}

export interface CreateOrUpdateDraftInput {
  draftId?: string;
  content: string;
  contentVersion?: number;
  displayLabel?: string;
  sourcePath?: string | null;
  editorState?: RecoveryDraftEditorState;
}

export interface ReadRecoveryDraftResult {
  metadata: RecoveryDraftMetadata;
  content: string;
}

export interface ListLatestDraftsOptions {
  status?: RecoveryDraftStatus;
  limit?: number;
}

export interface CleanupRecoveryDraftsOptions {
  activeDraftId?: string | null;
  keepLatest?: number;
  expireAfterMs?: number;
}

export interface CleanupRecoveryDraftsResult {
  deletedDraftIds: string[];
}

export interface RecoveryDraftManagerOptions {
  rootDir: string;
  ports: RecoveryDraftStoragePorts;
  now?: () => number;
  createDraftId?: () => string;
}

export interface RecoveryDraftManager {
  createOrUpdateDraft(
    input: CreateOrUpdateDraftInput,
  ): Promise<RecoveryDraftMetadata>;
  readDraft(draftId: string): Promise<ReadRecoveryDraftResult | null>;
  markPromoted(draftId: string): Promise<RecoveryDraftMetadata | null>;
  listLatestDrafts(
    options?: ListLatestDraftsOptions,
  ): Promise<RecoveryDraftMetadata[]>;
  cleanup(
    options?: CleanupRecoveryDraftsOptions,
  ): Promise<CleanupRecoveryDraftsResult>;
}

const DEFAULT_KEEP_LATEST = 5;
const DEFAULT_EXPIRE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const createRecoveryDraftManager = ({
  rootDir,
  ports,
  now = Date.now,
  createDraftId = () =>
    `draft-${now()}-${Math.random().toString(36).slice(2, 10)}`,
}: RecoveryDraftManagerOptions): RecoveryDraftManager => {
  const normalizedRoot = trimTrailingSlash(rootDir);
  const draftsDir = `${normalizedRoot}/drafts`;
  const indexPath = `${normalizedRoot}/index.json`;

  const getDraftPath = (draftId: string) =>
    `${draftsDir}/${encodeURIComponent(draftId)}.md`;

  const ensureStorage = async () => {
    await ports.ensureDir(normalizedRoot);
    await ports.ensureDir(draftsDir);
  };

  const readIndex = async (): Promise<RecoveryDraftIndexFile> => {
    try {
      return normalizeIndex(await ports.readJsonFile(indexPath));
    } catch {
      return { schemaVersion: 1, drafts: [] };
    }
  };

  const writeIndex = async (index: RecoveryDraftIndexFile) => {
    await ports.writeJsonFile(
      indexPath,
      index as unknown as RecoveryDraftJsonValue,
    );
  };

  return {
    async createOrUpdateDraft(input) {
      await ensureStorage();

      const timestamp = now();
      const draftId = input.draftId ?? createDraftId();
      const recoveryPath = getDraftPath(draftId);
      const index = await readIndex();
      const existing = index.drafts.find((draft) => draft.draftId === draftId);
      const editorState = normalizeEditorState(
        input.editorState ?? existing?.editorState,
      );
      const metadata: RecoveryDraftMetadata = {
        schemaVersion: 1,
        draftId,
        recoveryPath,
        status: 'active',
        updatedAt: timestamp,
        displayLabel:
          input.displayLabel ?? existing?.displayLabel ?? 'Recovered draft',
        sourcePath: input.sourcePath ?? existing?.sourcePath ?? null,
        contentVersion: input.contentVersion ?? existing?.contentVersion ?? 0,
        ...(editorState ? { editorState } : {}),
      };

      await ports.writeFileAtomic(recoveryPath, input.content);
      await writeIndex(upsertDraft(index, metadata));

      return metadata;
    },

    async readDraft(draftId) {
      const index = await readIndex();
      const metadata = index.drafts.find((draft) => draft.draftId === draftId);
      if (!metadata) {
        return null;
      }

      return {
        metadata,
        content: await ports.readFile(metadata.recoveryPath),
      };
    },

    async markPromoted(draftId) {
      const timestamp = now();
      const index = await readIndex();
      const existing = index.drafts.find((draft) => draft.draftId === draftId);
      if (!existing) {
        return null;
      }

      const metadata: RecoveryDraftMetadata = {
        ...existing,
        status: 'promoted',
        updatedAt: timestamp,
        promotedAt: timestamp,
      };
      await writeIndex(upsertDraft(index, metadata));

      return metadata;
    },

    async listLatestDrafts(options = {}) {
      const index = await readIndex();
      const status = options.status ?? 'active';
      const limit = options.limit ?? DEFAULT_KEEP_LATEST;

      return index.drafts
        .filter((draft) => draft.status === status)
        .sort(sortLatestFirst)
        .slice(0, limit);
    },

    async cleanup(options = {}) {
      const keepLatest = options.keepLatest ?? DEFAULT_KEEP_LATEST;
      const expireAfterMs = options.expireAfterMs ?? DEFAULT_EXPIRE_AFTER_MS;
      const activeDraftId = options.activeDraftId ?? null;
      const timestamp = now();
      const index = await readIndex();
      const activeKeepIds = new Set(
        index.drafts
          .filter((draft) => draft.status === 'active')
          .sort(sortLatestFirst)
          .slice(0, keepLatest)
          .map((draft) => draft.draftId),
      );
      if (activeDraftId) {
        activeKeepIds.add(activeDraftId);
      }

      const deletedDraftIds: string[] = [];
      const remaining: RecoveryDraftMetadata[] = [];

      for (const draft of index.drafts) {
        const isExpired = timestamp - draft.updatedAt > expireAfterMs;
        const shouldDelete =
          draft.status !== 'promoted' &&
          !activeKeepIds.has(draft.draftId) &&
          (isExpired || draft.status === 'abandoned');

        if (!shouldDelete) {
          remaining.push(draft);
          continue;
        }

        if (!isManagedDraftPath(draft, draftsDir, getDraftPath)) {
          remaining.push(draft);
          continue;
        }

        try {
          await ports.deleteFile(draft.recoveryPath);
          deletedDraftIds.push(draft.draftId);
        } catch {
          remaining.push(draft);
        }
      }

      await writeIndex({
        schemaVersion: 1,
        drafts: remaining.sort(sortLatestFirst),
      });

      return { deletedDraftIds };
    },
  };
};

const trimTrailingSlash = (path: string): string => path.replace(/\/+$/, '');

const isManagedDraftPath = (
  draft: RecoveryDraftMetadata,
  draftsDir: string,
  getDraftPath: (draftId: string) => string,
): boolean => {
  const expectedPath = getDraftPath(draft.draftId);
  return (
    draft.recoveryPath === expectedPath &&
    draft.recoveryPath.startsWith(`${draftsDir}/`)
  );
};

const sortLatestFirst = (
  left: RecoveryDraftMetadata,
  right: RecoveryDraftMetadata,
) =>
  right.updatedAt - left.updatedAt || left.draftId.localeCompare(right.draftId);

const upsertDraft = (
  index: RecoveryDraftIndexFile,
  metadata: RecoveryDraftMetadata,
): RecoveryDraftIndexFile => ({
  schemaVersion: 1,
  drafts: [
    metadata,
    ...index.drafts.filter((draft) => draft.draftId !== metadata.draftId),
  ].sort(sortLatestFirst),
});

const normalizeIndex = (
  value: RecoveryDraftJsonValue,
): RecoveryDraftIndexFile => {
  if (!isJsonRecord(value) || value.schemaVersion !== 1) {
    return { schemaVersion: 1, drafts: [] };
  }
  if (!Array.isArray(value.drafts)) {
    return { schemaVersion: 1, drafts: [] };
  }

  return {
    schemaVersion: 1,
    drafts: value.drafts
      .filter(isRecoveryDraftMetadata)
      .map((draft) => normalizeRecoveryDraftMetadata(draft)),
  };
};

const normalizeRecoveryDraftMetadata = (
  value: RecoveryDraftJsonValue,
): RecoveryDraftMetadata => {
  const metadata = value as unknown as RecoveryDraftMetadata;
  const editorState = normalizeEditorState(
    (value as { editorState?: unknown }).editorState,
  );
  return {
    schemaVersion: metadata.schemaVersion,
    draftId: metadata.draftId,
    recoveryPath: metadata.recoveryPath,
    status: metadata.status,
    updatedAt: metadata.updatedAt,
    displayLabel: metadata.displayLabel,
    ...(metadata.sourcePath !== undefined
      ? { sourcePath: metadata.sourcePath }
      : {}),
    ...(metadata.contentVersion !== undefined
      ? { contentVersion: metadata.contentVersion }
      : {}),
    ...(metadata.promotedAt !== undefined
      ? { promotedAt: metadata.promotedAt }
      : {}),
    ...(editorState ? { editorState } : {}),
  };
};

const isRecoveryDraftMetadata = (value: RecoveryDraftJsonValue): boolean => {
  if (!isJsonRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.draftId === 'string' &&
    typeof value.recoveryPath === 'string' &&
    (value.status === 'active' ||
      value.status === 'promoted' ||
      value.status === 'abandoned') &&
    typeof value.updatedAt === 'number' &&
    typeof value.displayLabel === 'string'
  );
};

const isJsonRecord = (
  value: RecoveryDraftJsonValue,
): value is { [key: string]: RecoveryDraftJsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeEditorState = (
  value: unknown,
): RecoveryDraftEditorState | undefined => {
  if (!isUnknownRecord(value)) {
    return undefined;
  }

  const editorState: RecoveryDraftEditorState = {};
  const selection = normalizeSelectionState(value.selection);
  const scrollTop = normalizeNonNegativeInteger(value.scrollTop);

  if (selection) {
    editorState.selection = selection;
  }
  if (scrollTop !== undefined) {
    editorState.scrollTop = scrollTop;
  }

  return Object.keys(editorState).length > 0 ? editorState : undefined;
};

const normalizeSelectionState = (
  value: unknown,
): RecoveryDraftEditorSelectionState | undefined => {
  if (!isUnknownRecord(value)) {
    return undefined;
  }

  const anchor = normalizeNonNegativeInteger(value.anchor);
  const head = normalizeNonNegativeInteger(value.head);
  const updatedAt = normalizeNonNegativeInteger(value.updatedAt);
  if (anchor === undefined || head === undefined || updatedAt === undefined) {
    return undefined;
  }

  return { anchor, head, updatedAt };
};

const normalizeNonNegativeInteger = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(Math.trunc(value), 0), Number.MAX_SAFE_INTEGER);
};

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
