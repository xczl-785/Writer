import type { RuntimePorts } from '../../core/runtime';
import {
  createRecoveryDraftManager,
  createSingleDocumentSessionShellState,
  type RecoveryDraftManager,
  type RecoveryDraftEditorState,
  type RecoveryDraftMetadata,
  type RecoveryDraftStoragePorts,
  type SingleDocumentSessionShellState,
} from '../../core/session';
import { tauriRuntimePorts } from '../../services/runtime/TauriRuntimePorts';

const QUICK_WRITE_RECOVERY_DIR = 'quick-write-recovery';
const QUICK_WRITE_DRAFT_LABEL = 'QuickWrite draft';

export interface QuickWriteRuntimeAdapter {
  readonly ports: QuickWriteRuntimePorts;
  createInitialState(): SingleDocumentSessionShellState;
  getInitialFilePath(): Promise<string | null>;
  listenFileOpen(listener: (filePath: string) => void): Promise<() => void>;
  openRecoveryDraft(): Promise<QuickWriteRecoveryDraft>;
  openNewRecoveryDraft(
    input?: QuickWriteOpenNewRecoveryDraftInput,
  ): Promise<QuickWriteRecoveryDraft>;
  saveRecoveryDraft(input: QuickWriteSaveRecoveryDraftInput): Promise<void>;
  savePendingDocument(input: QuickWriteSavePendingDocumentInput): Promise<void>;
  selectSaveTarget(): Promise<string | null>;
  selectHtmlExportTarget(): Promise<string | null>;
  exportHtmlFile(input: QuickWriteExportHtmlFileInput): Promise<void>;
  printDocument(): Promise<void>;
  openFilePath(path: string): Promise<QuickWriteOpenedFile>;
  openMarkdownFile(): Promise<QuickWriteOpenedFile | null>;
  openNewTemporaryDocumentWindow(): Promise<void>;
  canOpenNewTemporaryDocumentWindow(): boolean;
  markDraftPromoted(draftId: string): Promise<void>;
}

export interface QuickWriteRecoveryDraft {
  metadata: RecoveryDraftMetadata;
  content: string;
}

export interface QuickWriteSaveRecoveryDraftInput {
  draftId: string;
  content: string;
  contentVersion: number;
  editorState?: RecoveryDraftEditorState;
}

export interface QuickWriteSavePendingDocumentInput {
  targetKind: 'recovery' | 'file';
  path: string;
  content: string;
  contentVersion: number;
  draftId?: string | null;
  editorState?: RecoveryDraftEditorState;
}

export interface QuickWriteOpenedFile {
  path: string;
  content: string;
}

export interface QuickWriteExportHtmlFileInput {
  path: string;
  html: string;
}

export interface QuickWriteOpenNewRecoveryDraftInput {
  initialContent?: string;
}

type QuickWriteRuntimePorts = Pick<RuntimePorts, 'appConfig' | 'fileContent'> &
  Partial<Pick<RuntimePorts, 'fileDialog' | 'startupFile'>> & {
    quickWritePrint?: QuickWritePrintPort;
    quickWriteWindow?: QuickWriteWindowPort;
  };

export interface QuickWritePrintPort {
  printDocument(): Promise<void>;
}

export interface QuickWriteWindowPort {
  openNewTemporaryDocumentWindow(): Promise<void>;
}

export interface QuickWriteRuntimeAdapterOptions {
  ports?: QuickWriteRuntimePorts;
  manager?: RecoveryDraftManager;
}

export const createQuickWriteRuntimeAdapter = ({
  ports = tauriRuntimePorts,
  manager,
}: QuickWriteRuntimeAdapterOptions = {}): QuickWriteRuntimeAdapter => {
  let managerPromise: Promise<RecoveryDraftManager> | null = manager
    ? Promise.resolve(manager)
    : null;
  let saveQueue = Promise.resolve();

  const getManager = async () => {
    if (!managerPromise) {
      managerPromise = createQuickWriteRecoveryDraftManager(ports);
    }
    return managerPromise;
  };

  const savePendingDocument = async (
    input: QuickWriteSavePendingDocumentInput,
  ) => {
    const save = async () => {
      if (input.targetKind === 'file') {
        await ports.fileContent.writeFileAtomic(input.path, input.content);
        return;
      }

      if (!input.draftId) {
        throw new Error('QuickWrite recovery save requires a draft id');
      }

      const draftManager = await getManager();
      await draftManager.createOrUpdateDraft({
        draftId: input.draftId,
        content: input.content,
        contentVersion: input.contentVersion,
        displayLabel: QUICK_WRITE_DRAFT_LABEL,
        ...(input.editorState ? { editorState: input.editorState } : {}),
      });
    };
    const result = saveQueue.then(save, save);
    saveQueue = result.catch(() => undefined);
    await result;
  };

  return {
    ports,
    createInitialState() {
      return createSingleDocumentSessionShellState();
    },
    async getInitialFilePath() {
      if (!ports.startupFile) {
        return null;
      }

      try {
        const startupPath = await ports.startupFile.getStartupFilePath();
        if (startupPath) {
          return startupPath;
        }
        return await ports.startupFile.getPendingFilePath();
      } catch {
        return null;
      }
    },
    async listenFileOpen(listener) {
      if (!ports.startupFile) {
        return () => undefined;
      }

      return ports.startupFile.listenFileOpen(listener);
    },
    async openRecoveryDraft() {
      const draftManager = await getManager();
      const activeDrafts = await draftManager.listLatestDrafts({
        status: 'active',
        limit: Number.MAX_SAFE_INTEGER,
      });

      for (const activeDraft of activeDrafts) {
        try {
          const draft = await draftManager.readDraft(activeDraft.draftId);
          if (draft) {
            return draft;
          }
        } catch {
          continue;
        }
      }

      const metadata = await draftManager.createOrUpdateDraft({
        content: '',
        displayLabel: QUICK_WRITE_DRAFT_LABEL,
      });
      return { metadata, content: '' };
    },
    async openNewRecoveryDraft(input = {}) {
      const draftManager = await getManager();
      const content = input.initialContent ?? '';
      const metadata = await draftManager.createOrUpdateDraft({
        content,
        displayLabel: QUICK_WRITE_DRAFT_LABEL,
      });
      return { metadata, content };
    },
    async saveRecoveryDraft(input) {
      await savePendingDocument({
        targetKind: 'recovery',
        path: '',
        draftId: input.draftId,
        content: input.content,
        contentVersion: input.contentVersion,
        ...(input.editorState ? { editorState: input.editorState } : {}),
      });
    },
    savePendingDocument,
    async selectSaveTarget() {
      if (!ports.fileDialog) {
        throw new Error('QuickWrite save target selection requires fileDialog');
      }

      return ports.fileDialog.save({
        title: 'Save QuickWrite Markdown',
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
        canCreateDirectories: true,
      });
    },
    async selectHtmlExportTarget() {
      if (!ports.fileDialog) {
        throw new Error('QuickWrite HTML export requires fileDialog');
      }

      return ports.fileDialog.save({
        title: 'Export QuickWrite HTML',
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
        canCreateDirectories: true,
      });
    },
    async exportHtmlFile(input) {
      await ports.fileContent.writeFileAtomic(input.path, input.html);
    },
    async printDocument() {
      if (ports.quickWritePrint) {
        await ports.quickWritePrint.printDocument();
        return;
      }

      throw new Error('QuickWrite print runtime is not available');
    },
    async openMarkdownFile() {
      if (!ports.fileDialog) {
        throw new Error('QuickWrite open requires fileDialog');
      }

      const selected = await ports.fileDialog.open({
        title: 'Open Markdown',
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
        multiple: false,
        directory: false,
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) {
        return null;
      }

      return {
        path,
        content: await ports.fileContent.readFile(path),
      };
    },
    async openFilePath(path) {
      return {
        path,
        content: await ports.fileContent.readFile(path),
      };
    },
    openNewTemporaryDocumentWindow() {
      if (!ports.quickWriteWindow) {
        throw new Error('QuickWrite new window runtime is not available');
      }

      return ports.quickWriteWindow.openNewTemporaryDocumentWindow();
    },
    canOpenNewTemporaryDocumentWindow() {
      return Boolean(ports.quickWriteWindow);
    },
    async markDraftPromoted(draftId) {
      const draftManager = await getManager();
      await draftManager.markPromoted(draftId);
    },
  };
};

const createQuickWriteRecoveryDraftManager = async (
  ports: Pick<RuntimePorts, 'appConfig' | 'fileContent'>,
): Promise<RecoveryDraftManager> => {
  const rootDir = `${trimTrailingSlash(
    await ports.appConfig.getAppConfigDir(),
  )}/${QUICK_WRITE_RECOVERY_DIR}`;

  return createRecoveryDraftManager({
    rootDir,
    ports: createRecoveryDraftStoragePorts(ports),
  });
};

const createRecoveryDraftStoragePorts = (
  ports: Pick<RuntimePorts, 'appConfig' | 'fileContent'>,
): RecoveryDraftStoragePorts => ({
  readFile: ports.fileContent.readFile,
  writeFileAtomic: ports.fileContent.writeFileAtomic,
  ensureDir(path) {
    if (!ports.fileContent.ensureDir) {
      throw new Error('QuickWrite recovery storage requires ensureDir');
    }
    return ports.fileContent.ensureDir(path);
  },
  deleteFile(path) {
    if (!ports.fileContent.deleteFile) {
      throw new Error('QuickWrite recovery storage requires deleteFile');
    }
    return ports.fileContent.deleteFile(path);
  },
  readJsonFile: ports.appConfig.readJsonFile,
  writeJsonFile: ports.appConfig.writeJsonFile,
});

const trimTrailingSlash = (path: string): string => path.replace(/\/+$/, '');
