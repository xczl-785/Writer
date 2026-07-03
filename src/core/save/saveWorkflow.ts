import type { SaveStatus, SaveStatusEvent } from './saveTypes';

export const reduceSaveStatus = (
  status: SaveStatus,
  event: SaveStatusEvent,
): SaveStatus => {
  switch (event.type) {
    case 'scheduled':
      return 'dirty';
    case 'started':
      return 'saving';
    case 'succeeded':
      return 'saved';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return status === 'dirty' ? 'idle' : status;
  }
};

export const isTerminalSaveStatus = (status: SaveStatus): boolean =>
  status === 'saved' || status === 'failed';
