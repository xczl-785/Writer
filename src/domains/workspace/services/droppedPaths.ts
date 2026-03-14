import type { PathKind } from '../../../services/fs/FsService';

export interface DroppedPathLike {
  path?: string;
}

export interface DroppedPathClassification {
  directories: string[];
  files: string[];
  missing: string[];
  other: string[];
}

export const extractDroppedPaths = (
  files: ArrayLike<DroppedPathLike>,
): string[] => {
  const seen = new Set<string>();
  const paths: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const path = files[index]?.path?.trim();
    if (!path || seen.has(path)) {
      continue;
    }

    seen.add(path);
    paths.push(path);
  }

  return paths;
};

export const classifyDroppedPaths = async (
  paths: string[],
  getPathKind: (path: string) => Promise<PathKind>,
): Promise<DroppedPathClassification> => {
  const classification: DroppedPathClassification = {
    directories: [],
    files: [],
    missing: [],
    other: [],
  };

  for (const path of paths) {
    const kind = await getPathKind(path);

    if (kind === 'directory') {
      classification.directories.push(path);
      continue;
    }

    if (kind === 'file') {
      classification.files.push(path);
      continue;
    }

    if (kind === 'missing') {
      classification.missing.push(path);
      continue;
    }

    classification.other.push(path);
  }

  return classification;
};
