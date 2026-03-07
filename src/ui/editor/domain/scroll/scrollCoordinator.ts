/**
 * Scroll Coordinator
 *
 * Coordinates scroll requests from multiple sources.
 * Currently acts as a pass-through without changing existing behavior.
 * Provides a unified entry point for future scroll conflict management.
 */

import type { ScrollRequest, ScrollResult, ScrollContainerInfo } from './scrollTypes';

export type ScrollCoordinator = {
  requestScroll: (request: ScrollRequest, containerInfo: ScrollContainerInfo) => ScrollResult;
  getCurrentRequest: () => ScrollRequest | null;
  reset: () => void;
};

export const createScrollCoordinator = (): ScrollCoordinator => {
  let currentRequest: ScrollRequest | null = null;

  return {
    requestScroll: (
      request: ScrollRequest,
      containerInfo: ScrollContainerInfo,
    ): ScrollResult => {
      currentRequest = request;

      if (request.targetScrollTop !== undefined) {
        const targetScrollTop = Math.max(
          0,
          Math.min(request.targetScrollTop, containerInfo.scrollHeight - containerInfo.clientHeight),
        );
        return {
          handled: true,
          actualScrollTop: targetScrollTop,
          source: request.source,
        };
      }

      return {
        handled: false,
        actualScrollTop: containerInfo.scrollTop,
        source: request.source,
      };
    },

    getCurrentRequest: (): ScrollRequest | null => {
      return currentRequest;
    },

    reset: (): void => {
      currentRequest = null;
    },
  };
};