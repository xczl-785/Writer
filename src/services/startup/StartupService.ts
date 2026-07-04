import { tauriRuntimePorts } from '../runtime/TauriRuntimePorts';

type Unlisten = () => void;

export async function getStartupFilePath(): Promise<string | null> {
  try {
    return await tauriRuntimePorts.startupFile.getStartupFilePath();
  } catch (error) {
    console.error('Failed to get startup file path:', error);
    return null;
  }
}

export async function getPendingFilePath(): Promise<string | null> {
  try {
    return await tauriRuntimePorts.startupFile.getPendingFilePath();
  } catch (error) {
    console.error('Failed to get pending file path:', error);
    return null;
  }
}

export type FileOpenListener = (filePath: string) => void;

export async function listenFileOpen(
  listener: FileOpenListener,
): Promise<Unlisten> {
  return tauriRuntimePorts.startupFile.listenFileOpen(listener);
}

export async function getInitialFilePath(): Promise<string | null> {
  const startupPath = await getStartupFilePath();
  if (startupPath) {
    return startupPath;
  }
  return getPendingFilePath();
}
