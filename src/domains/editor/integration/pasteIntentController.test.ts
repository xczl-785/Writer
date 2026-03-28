import { describe, expect, it } from 'vitest';
import {
  clearNextPasteIntent,
  consumeNextPasteIntent,
  setNextPasteIntent,
} from './pasteIntentController';

describe('pasteIntentController', () => {
  it('consumes plain intent exactly once', () => {
    clearNextPasteIntent();
    setNextPasteIntent('plain');

    expect(consumeNextPasteIntent()).toBe('plain');
    expect(consumeNextPasteIntent()).toBe('default');
  });

  it('clears pending intent explicitly', () => {
    setNextPasteIntent('plain');
    clearNextPasteIntent();

    expect(consumeNextPasteIntent()).toBe('default');
  });
});
