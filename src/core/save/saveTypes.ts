export interface SaveTarget {
  path: string;
}

export interface SaveInput {
  target: SaveTarget;
  content: string;
  contentVersion?: number;
}

export interface SaveSuccess {
  ok: true;
  target: SaveTarget;
  contentVersion?: number;
  savedAt: number;
}

export interface SaveFailure {
  ok: false;
  target: SaveTarget;
  contentVersion?: number;
  error: unknown;
  failedAt: number;
}

export type SaveResult = SaveSuccess | SaveFailure;

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

export type SaveStatusEvent =
  | { type: 'scheduled'; target: SaveTarget }
  | { type: 'started'; target: SaveTarget }
  | { type: 'succeeded'; target: SaveTarget; savedAt: number }
  | { type: 'failed'; target: SaveTarget; error: unknown; failedAt: number }
  | { type: 'cancelled'; target: SaveTarget };
