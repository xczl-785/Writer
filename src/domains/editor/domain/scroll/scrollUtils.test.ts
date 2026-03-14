/**
 * Scroll Utils Tests
 *
 * Tests for scroll utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveEditorContentTopOffset,
  shouldSkipScrollAdjustment,
} from './scrollUtils';

describe('scrollUtils', () => {
  describe('resolveEditorContentTopOffset', () => {
    it('should return 0 when CSS variable is not set', () => {
      const element = document.createElement('div');
      const result = resolveEditorContentTopOffset(element);
      expect(result).toBe(0);
    });

    it('should parse valid CSS variable value', () => {
      const element = document.createElement('div');
      element.style.setProperty('--editor-content-offset-top', '64px');
      document.body.appendChild(element);

      const result = resolveEditorContentTopOffset(element);
      expect(result).toBe(64);

      document.body.removeChild(element);
    });

    it('should handle negative values by returning 0', () => {
      const element = document.createElement('div');
      element.style.setProperty('--editor-content-offset-top', '-10px');
      document.body.appendChild(element);

      const result = resolveEditorContentTopOffset(element);
      expect(result).toBe(0);

      document.body.removeChild(element);
    });
  });

  describe('shouldSkipScrollAdjustment', () => {
    it('should return true when delta is less than threshold', () => {
      expect(shouldSkipScrollAdjustment(100, 103, 6)).toBe(true);
      expect(shouldSkipScrollAdjustment(100, 97, 6)).toBe(true);
    });

    it('should return false when delta is greater than threshold', () => {
      expect(shouldSkipScrollAdjustment(100, 110, 6)).toBe(false);
      expect(shouldSkipScrollAdjustment(100, 90, 6)).toBe(false);
    });

    it('should use default threshold of 6', () => {
      expect(shouldSkipScrollAdjustment(100, 105)).toBe(true);
      expect(shouldSkipScrollAdjustment(100, 107)).toBe(false);
    });

    it('should respect custom threshold', () => {
      expect(shouldSkipScrollAdjustment(100, 108, 10)).toBe(true);
      expect(shouldSkipScrollAdjustment(100, 112, 10)).toBe(false);
    });
  });
});
