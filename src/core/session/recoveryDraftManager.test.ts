import { describe, expect, it } from 'vitest';
import {
  createRecoveryDraftManager,
  type RecoveryDraftIndexFile,
  type RecoveryDraftJsonValue,
  type RecoveryDraftStoragePorts,
} from './recoveryDraftManager';

const createMemoryPorts = (): RecoveryDraftStoragePorts & {
  files: Map<string, string>;
  deleted: string[];
} => {
  const files = new Map<string, string>();
  const deleted: string[] = [];

  return {
    files,
    deleted,
    async readFile(path) {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`missing file: ${path}`);
      }
      return content;
    },
    async writeFileAtomic(path, content) {
      files.set(path, content);
    },
    async ensureDir(path) {
      files.set(`${path}/.dir`, '');
    },
    async deleteFile(path) {
      deleted.push(path);
      files.delete(path);
    },
    async readJsonFile(path) {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`missing json: ${path}`);
      }
      return JSON.parse(content) as RecoveryDraftJsonValue;
    },
    async writeJsonFile(path, data) {
      files.set(path, JSON.stringify(data));
    },
  };
};

describe('recoveryDraftManager', () => {
  it('creates and reads a recovery draft using index metadata', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 10,
    });

    const draft = await manager.createOrUpdateDraft({
      draftId: 'd1',
      content: 'draft body',
      contentVersion: 2,
      displayLabel: 'Untitled',
    });
    const read = await manager.readDraft('d1');

    expect(draft).toMatchObject({
      draftId: 'd1',
      recoveryPath: '/app/recovery/drafts/d1.md',
      status: 'active',
      updatedAt: 10,
      contentVersion: 2,
      displayLabel: 'Untitled',
    });
    expect(read).toMatchObject({
      metadata: draft,
      content: 'draft body',
    });
  });

  it('stores editor metadata in the index without appending it to draft markdown', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 10,
    });

    await manager.createOrUpdateDraft({
      draftId: 'd1',
      content: 'draft body',
      editorState: {
        selection: { anchor: 2, head: 5, updatedAt: 9 },
        scrollTop: 120,
      },
    });
    const index = JSON.parse(
      ports.files.get('/app/recovery/index.json') ?? 'null',
    ) as RecoveryDraftIndexFile;
    const read = await manager.readDraft('d1');

    expect(index.drafts[0]?.editorState).toEqual({
      selection: { anchor: 2, head: 5, updatedAt: 9 },
      scrollTop: 120,
    });
    expect(ports.files.get('/app/recovery/drafts/d1.md')).toBe('draft body');
    expect(read?.metadata.editorState).toEqual(index.drafts[0]?.editorState);
  });

  it('normalizes or drops invalid editor metadata when reading the index', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
    });

    await ports.writeJsonFile('/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        {
          ...draft('normalized', 2, 'active'),
          editorState: {
            selection: { anchor: -4, head: 2.8, updatedAt: -1 },
            scrollTop: 10.9,
          },
        },
        {
          ...draft('dropped', 1, 'active'),
          editorState: {
            selection: { anchor: 1, head: 'bad', updatedAt: 2 },
            scrollTop: Number.POSITIVE_INFINITY,
          },
        },
      ],
    } as RecoveryDraftJsonValue);
    ports.files.set('/app/recovery/drafts/normalized.md', 'normalized');
    ports.files.set('/app/recovery/drafts/dropped.md', 'dropped');

    const drafts = await manager.listLatestDrafts({ limit: 2 });

    expect(drafts.find((item) => item.draftId === 'normalized')).toMatchObject({
      editorState: {
        selection: { anchor: 0, head: 2, updatedAt: 0 },
        scrollTop: 10,
      },
    });
    expect(
      drafts.find((item) => item.draftId === 'dropped'),
    ).not.toHaveProperty('editorState');
  });

  it('updates an existing draft and lists latest active drafts first', async () => {
    const ports = createMemoryPorts();
    let time = 0;
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => time,
    });

    time = 1;
    await manager.createOrUpdateDraft({ draftId: 'old', content: 'old' });
    time = 3;
    await manager.createOrUpdateDraft({ draftId: 'new', content: 'new' });
    time = 4;
    await manager.createOrUpdateDraft({
      draftId: 'old',
      content: 'old updated',
    });

    expect(await manager.listLatestDrafts()).toMatchObject([
      { draftId: 'old', updatedAt: 4 },
      { draftId: 'new', updatedAt: 3 },
    ]);
    expect((await manager.readDraft('old'))?.content).toBe('old updated');
  });

  it('marks a draft as promoted without deleting its file', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 20,
    });

    await manager.createOrUpdateDraft({ draftId: 'd1', content: 'body' });
    const promoted = await manager.markPromoted('d1');

    expect(promoted).toMatchObject({
      draftId: 'd1',
      status: 'promoted',
      promotedAt: 20,
      updatedAt: 20,
    });
    expect(ports.files.get('/app/recovery/drafts/d1.md')).toBe('body');
  });

  it('cleans old drafts without deleting the active draft id', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 100,
    });

    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        draft('active-keep', 1, 'active'),
        draft('newest', 99, 'active'),
        draft('expired', 1, 'active'),
        draft('promoted-old', 1, 'promoted'),
      ],
    });
    ports.files.set('/app/recovery/drafts/active-keep.md', 'active');
    ports.files.set('/app/recovery/drafts/newest.md', 'newest');
    ports.files.set('/app/recovery/drafts/expired.md', 'expired');
    ports.files.set('/app/recovery/drafts/promoted-old.md', 'promoted');

    const result = await manager.cleanup({
      activeDraftId: 'active-keep',
      keepLatest: 1,
      expireAfterMs: 7,
    });

    expect(result.deletedDraftIds).toEqual(['expired']);
    expect(ports.deleted).toEqual(['/app/recovery/drafts/expired.md']);
    expect(
      await manager.listLatestDrafts({ status: 'active', limit: 10 }),
    ).toMatchObject([{ draftId: 'newest' }, { draftId: 'active-keep' }]);
    expect(ports.files.has('/app/recovery/drafts/promoted-old.md')).toBe(true);
  });

  it('skips cleanup deletes for recovery paths outside the managed drafts root', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 100,
    });

    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        {
          ...draft('outside-root', 1, 'active'),
          recoveryPath: '/Users/example/Documents/outside-root.md',
        },
      ],
    });

    const result = await manager.cleanup({
      keepLatest: 0,
      expireAfterMs: 7,
    });

    expect(result.deletedDraftIds).toEqual([]);
    expect(ports.deleted).toEqual([]);
    expect(
      await manager.listLatestDrafts({ status: 'active', limit: 10 }),
    ).toMatchObject([{ draftId: 'outside-root' }]);
  });

  it('skips cleanup deletes for directory-like or mismatched recovery paths', async () => {
    const ports = createMemoryPorts();
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 100,
    });

    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        {
          ...draft('directory-path', 1, 'abandoned'),
          recoveryPath: '/app/recovery/drafts/directory-path',
        },
        {
          ...draft('mismatched-id', 1, 'abandoned'),
          recoveryPath: '/app/recovery/drafts/other-id.md',
        },
      ],
    });

    const result = await manager.cleanup({
      keepLatest: 0,
      expireAfterMs: 7,
    });

    expect(result.deletedDraftIds).toEqual([]);
    expect(ports.deleted).toEqual([]);
    expect(
      await manager.listLatestDrafts({ status: 'abandoned', limit: 10 }),
    ).toMatchObject([
      { draftId: 'directory-path' },
      { draftId: 'mismatched-id' },
    ]);
  });

  it('keeps metadata and continues cleanup when deleting one draft fails', async () => {
    const ports = createMemoryPorts();
    const originalDeleteFile = ports.deleteFile;
    ports.deleteFile = async (path) => {
      if (path === '/app/recovery/drafts/delete-fails.md') {
        throw new Error('delete failed');
      }
      await originalDeleteFile(path);
    };
    const manager = createRecoveryDraftManager({
      rootDir: '/app/recovery',
      ports,
      now: () => 100,
    });

    await seedIndex(ports, '/app/recovery/index.json', {
      schemaVersion: 1,
      drafts: [
        draft('delete-fails', 1, 'abandoned'),
        draft('delete-succeeds', 1, 'abandoned'),
      ],
    });
    ports.files.set('/app/recovery/drafts/delete-fails.md', 'failed delete');
    ports.files.set('/app/recovery/drafts/delete-succeeds.md', 'deleted');

    const result = await manager.cleanup({
      keepLatest: 0,
      expireAfterMs: 7,
    });

    expect(result.deletedDraftIds).toEqual(['delete-succeeds']);
    expect(ports.deleted).toEqual(['/app/recovery/drafts/delete-succeeds.md']);
    expect(
      await manager.listLatestDrafts({ status: 'abandoned', limit: 10 }),
    ).toMatchObject([{ draftId: 'delete-fails' }]);
  });
});

const seedIndex = async (
  ports: RecoveryDraftStoragePorts,
  path: string,
  index: RecoveryDraftIndexFile,
): Promise<void> => {
  await ports.writeJsonFile(path, index as unknown as RecoveryDraftJsonValue);
};

const draft = (
  draftId: string,
  updatedAt: number,
  status: 'active' | 'promoted' | 'abandoned',
) => ({
  schemaVersion: 1 as const,
  draftId,
  recoveryPath: `/app/recovery/drafts/${draftId}.md`,
  status,
  updatedAt,
  displayLabel: 'Recovered draft',
  sourcePath: null,
  contentVersion: 1,
});
