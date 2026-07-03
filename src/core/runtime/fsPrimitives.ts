export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EncodingStatus {
  label: string;
}

export type PathKind = 'file' | 'directory' | 'missing' | 'other';

export type Unlisten = () => void;

export interface FileContentPort {
  readFile(path: string): Promise<string>;
  writeFileAtomic(path: string, content: string): Promise<void>;
  ensureDir?(path: string): Promise<void>;
  deleteFile?(path: string): Promise<void>;
}

export interface PathInfoPort {
  checkExists(path: string): Promise<boolean>;
  getPathKind(path: string): Promise<PathKind>;
  detectFileEncoding(path: string): Promise<EncodingStatus>;
}

export interface AppConfigPort {
  getAppConfigDir(): Promise<string>;
  readJsonFile(path: string): Promise<JsonValue>;
  writeJsonFile(path: string, data: JsonValue): Promise<void>;
}

export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

export interface OpenFileDialogOptions {
  title?: string;
  filters?: FileDialogFilter[];
  defaultPath?: string;
  multiple?: boolean;
  directory?: boolean;
  recursive?: boolean;
  canCreateDirectories?: boolean;
}

export interface SaveFileDialogOptions {
  title?: string;
  filters?: FileDialogFilter[];
  defaultPath?: string;
  canCreateDirectories?: boolean;
}

export interface FileDialogPort {
  open(options?: OpenFileDialogOptions): Promise<string | string[] | null>;
  save(options?: SaveFileDialogOptions): Promise<string | null>;
}

export type StartupFileListener = (filePath: string) => void;

export interface StartupFilePort {
  getStartupFilePath(): Promise<string | null>;
  getPendingFilePath(): Promise<string | null>;
  listenFileOpen(listener: StartupFileListener): Promise<Unlisten>;
}

export interface RuntimePorts {
  fileContent: FileContentPort;
  pathInfo: PathInfoPort;
  appConfig: AppConfigPort;
  fileDialog: FileDialogPort;
  startupFile: StartupFilePort;
}
