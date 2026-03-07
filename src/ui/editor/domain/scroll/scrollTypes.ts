/**
 * Scroll Coordinator Types
 *
 * Type definitions for scroll event coordination.
 * This module provides unified scroll request handling without changing existing behavior.
 */

export type ScrollSource =
  | 'typewriter'
  | 'outline-navigation'
  | 'slash-menu'
  | 'find-replace';

export type ScrollBehavior = 'instant' | 'smooth';

export type ScrollRequest = {
  source: ScrollSource;
  targetScrollTop?: number;
  targetPosition?: number;
  behavior?: ScrollBehavior;
  metadata?: Record<string, unknown>;
};

export type ScrollResult = {
  handled: boolean;
  actualScrollTop: number;
  source: ScrollSource;
};

export type ScrollContainerInfo = {
  element: HTMLElement;
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  offsetTop: number;
};