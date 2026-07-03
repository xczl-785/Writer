import type { SaveInput, SaveResult } from './saveTypes';
import type { SavePort } from './savePort';

export type WriteFileAtomic = (path: string, content: string) => Promise<void>;

export interface WriteFileAtomicSavePortOptions {
  writeFileAtomic: WriteFileAtomic;
  now?: () => number;
}

export const createWriteFileAtomicSavePort = ({
  writeFileAtomic,
  now = Date.now,
}: WriteFileAtomicSavePortOptions): SavePort => ({
  async save(input: SaveInput): Promise<SaveResult> {
    try {
      await writeFileAtomic(input.target.path, input.content);
      return {
        ok: true,
        target: input.target,
        savedAt: now(),
      };
    } catch (error) {
      return {
        ok: false,
        target: input.target,
        error,
        failedAt: now(),
      };
    }
  },
});
