import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import type {
  AppConfigPort,
  FileContentPort,
  FileDialogPort,
  JsonValue,
  PathInfoPort,
  RuntimePorts,
  StartupFileListener,
  StartupFilePort,
  Unlisten,
} from '../../core/runtime';

const FILE_OPEN_EVENT = 'writer:file-open';
const FILE_CHANGE_EVENT = 'writer://file-change';

export interface FileChangePayload {
  kind: string;
  paths: string[];
}

export interface FileWatcherRuntimePort {
  listenFileChanges(
    listener: (payload: FileChangePayload) => void,
  ): Promise<Unlisten>;
  startWatching(paths: string[]): Promise<void>;
  stopWatching(): Promise<void>;
  updateWatchPaths(newPaths: string[]): Promise<void>;
}

export const tauriFileContentPort: FileContentPort = {
  readFile(path) {
    return invoke('read_file', { path });
  },

  writeFileAtomic(path, content) {
    return invoke('write_file_atomic', { path, content });
  },

  async ensureDir(path) {
    try {
      await invoke('create_dir', { path });
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }
  },

  deleteFile(path) {
    return invoke('delete_node', { path });
  },
};

export const tauriPathInfoPort: PathInfoPort = {
  checkExists(path) {
    return invoke('check_exists', { path });
  },

  getPathKind(path) {
    return invoke('get_path_kind', { path });
  },

  detectFileEncoding(path) {
    return invoke('detect_file_encoding', { path });
  },
};

export const tauriAppConfigPort: AppConfigPort = {
  getAppConfigDir() {
    return invoke('get_app_config_dir');
  },

  readJsonFile(path) {
    return invoke<JsonValue>('read_json_file', { path });
  },

  writeJsonFile(path, data) {
    return invoke('write_json_file', { path, data });
  },
};

export const tauriFileDialogPort: FileDialogPort = {
  open(options) {
    return open(options);
  },

  save(options) {
    return save(options);
  },
};

export const tauriStartupFilePort: StartupFilePort = {
  getStartupFilePath() {
    return invoke<string | null>('get_startup_file_path');
  },

  getPendingFilePath() {
    return invoke<string | null>('get_pending_file_path');
  },

  async listenFileOpen(listener: StartupFileListener): Promise<Unlisten> {
    return listen<string>(FILE_OPEN_EVENT, (event) => {
      listener(event.payload);
    });
  },
};

export const tauriFileWatcherPort: FileWatcherRuntimePort = {
  async listenFileChanges(listener) {
    return listen<FileChangePayload>(FILE_CHANGE_EVENT, (event) => {
      listener(event.payload);
    });
  },

  startWatching(paths) {
    return invoke('start_watching', { paths });
  },

  stopWatching() {
    return invoke('stop_watching');
  },

  updateWatchPaths(newPaths) {
    return invoke('update_watch_paths', { newPaths });
  },
};

export const tauriQuickWriteWindowPort: QuickWriteWindowPort = {
  openNewTemporaryDocumentWindow() {
    return invoke('open_quick_write_window');
  },
};

export const tauriQuickWritePrintPort: QuickWritePrintPort = {
  async printDocument() {
    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      throw new Error('QuickWrite print runtime is not available');
    }

    window.print();
  },
};

export type TauriRuntimePorts = RuntimePorts & {
  quickWritePrint: QuickWritePrintPort;
  quickWriteWindow: QuickWriteWindowPort;
};

interface QuickWritePrintPort {
  printDocument(): Promise<void>;
}

interface QuickWriteWindowPort {
  openNewTemporaryDocumentWindow(): Promise<void>;
}

export const tauriRuntimePorts: TauriRuntimePorts = {
  fileContent: tauriFileContentPort,
  pathInfo: tauriPathInfoPort,
  appConfig: tauriAppConfigPort,
  fileDialog: tauriFileDialogPort,
  startupFile: tauriStartupFilePort,
  quickWritePrint: tauriQuickWritePrintPort,
  quickWriteWindow: tauriQuickWriteWindowPort,
};

const isAlreadyExistsError = (error: unknown): boolean =>
  typeof error === 'string' && error.includes('already exists');
