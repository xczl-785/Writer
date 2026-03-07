/**
 * Scroll Coordinator Tests
 *
 * Tests for scroll coordination module.
 */

import { describe, it, expect } from 'vitest';
import { createScrollCoordinator } from './scrollCoordinator';
import type { ScrollContainerInfo } from './scrollTypes';

describe('scrollCoordinator', () => {
  const mockContainerInfo: ScrollContainerInfo = {
    element: {} as HTMLElement,
    scrollTop: 0,
    clientHeight: 600,
    scrollHeight: 1200,
    offsetTop: 0,
  };

  it('should handle scroll request with targetScrollTop', () => {
    const coordinator = createScrollCoordinator();
    const result = coordinator.requestScroll(
      {
        source: 'typewriter',
        targetScrollTop: 300,
      },
      mockContainerInfo,
    );

    expect(result.handled).toBe(true);
    expect(result.actualScrollTop).toBe(300);
    expect(result.source).toBe('typewriter');
  });

  it('should clamp scrollTop to valid range', () => {
    const coordinator = createScrollCoordinator();
    const result = coordinator.requestScroll(
      {
        source: 'typewriter',
        targetScrollTop: 1000,
      },
      mockContainerInfo,
    );

    expect(result.handled).toBe(true);
    expect(result.actualScrollTop).toBe(600);
  });

  it('should handle scroll request without targetScrollTop', () => {
    const coordinator = createScrollCoordinator();
    const result = coordinator.requestScroll(
      {
        source: 'outline-navigation',
      },
      mockContainerInfo,
    );

    expect(result.handled).toBe(false);
    expect(result.actualScrollTop).toBe(0);
  });

  it('should track current request', () => {
    const coordinator = createScrollCoordinator();
    const request = {
      source: 'find-replace' as const,
      targetScrollTop: 200,
    };

    coordinator.requestScroll(request, mockContainerInfo);
    expect(coordinator.getCurrentRequest()).toEqual(request);
  });

  it('should reset coordinator state', () => {
    const coordinator = createScrollCoordinator();
    coordinator.requestScroll(
      {
        source: 'slash-menu',
        targetScrollTop: 100,
      },
      mockContainerInfo,
    );

    coordinator.reset();
    expect(coordinator.getCurrentRequest()).toBeNull();
  });
});