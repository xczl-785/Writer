import type { SavePort } from '../save/savePort';
import type { SaveFailure } from '../save/saveTypes';
import type { SaveSchedulerInput, SaveSchedulerPorts } from './SaveScheduler';

export class SavePortFailureError extends Error {
  readonly result: SaveFailure;

  constructor(result: SaveFailure) {
    super(`SavePort failed to save ${result.target.path}`);
    this.name = 'SavePortFailureError';
    this.result = result;
  }
}

export const createSaveSchedulerSaveFromSavePort = (
  savePort: SavePort,
): SaveSchedulerPorts['save'] => {
  return async (input: SaveSchedulerInput): Promise<void> => {
    const result = await savePort.save({
      target: { path: input.path },
      content: input.content,
    });

    if (!result.ok) {
      throw new SavePortFailureError(result);
    }
  };
};
