import type { SaveInput, SaveResult } from './saveTypes';

// Future save-core port: result-returning by design. The current
// SaveScheduler adapter still uses a throw-based persistence port and must map.
export interface SavePort {
  save(input: SaveInput): Promise<SaveResult>;
}
