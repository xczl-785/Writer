import {
  useStatusStore,
  type SaveErrorAction,
  type SaveErrorCategory,
} from '../../state/slices/statusSlice';
import { t } from '../../i18n';

/**
 * Error classification for user-friendly messages
 */
export type ErrorCategory = SaveErrorCategory;

/**
 * Structured error information
 */
export interface ErrorInfo {
  category: ErrorCategory;
  reason: string;
  suggestion: string;
  action?: SaveErrorAction;
}

interface ErrorInfoOptions {
  category?: ErrorCategory;
  reason?: string;
  suggestion?: string;
  action?: SaveErrorAction;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Categorize error based on error message/type
 */
function categorizeError(error: unknown): ErrorCategory {
  const message = toMessage(error).toLowerCase();

  if (
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('unauthorized') ||
    message.includes('operation not permitted')
  ) {
    return 'permission';
  }

  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused')
  ) {
    return 'network';
  }

  if (
    message.includes('not found') ||
    message.includes('invalid') ||
    message.includes('exists')
  ) {
    return 'user';
  }

  return 'system';
}

/**
 * Generate user-friendly error info
 */
function generateErrorInfo(
  error: unknown,
  context: string,
  options?: ErrorInfoOptions,
): ErrorInfo {
  const actualCategory = options?.category ?? categorizeError(error);
  const message = toMessage(error);

  const baseInfo: ErrorInfo = (() => {
    switch (actualCategory) {
      case 'permission':
        return {
          category: 'permission',
          reason: t('error.permission'),
          suggestion: t('error.permissionSuggestion'),
        };

      case 'network':
        return {
          category: 'network',
          reason: t('error.network'),
          suggestion: t('error.networkSuggestion'),
        };

      case 'user':
        return {
          category: 'user',
          reason: message,
          suggestion: t('error.userSuggestion'),
        };

      default:
        return {
          category: 'system',
          reason: `${context} ${t('error.unknown')}`,
          suggestion: t('error.systemSuggestion'),
        };
    }
  })();

  return {
    ...baseInfo,
    reason: options?.reason ?? baseInfo.reason,
    suggestion: options?.suggestion ?? baseInfo.suggestion,
    action: options?.action,
  };
}

export const ErrorService = {
  log(error: unknown, context: string): void {
    console.error(`[${context}]`, error);
  },

  handle(error: unknown, context: string, userMessage?: string): void {
    const message = toMessage(error);
    this.log(error, context);
    useStatusStore
      .getState()
      .setStatus('error', userMessage ?? `${context}: ${message}`);
  },

  /**
   * Handle error with structured info.
   */
  handleWithInfo(
    error: unknown,
    context: string,
    options?: ErrorInfoOptions,
  ): ErrorInfo {
    const info = generateErrorInfo(error, context, options);
    this.log(error, context);
    useStatusStore.getState().setSaveError(info.reason, info.suggestion, {
      category: info.category,
      action: info.action,
    });
    return info;
  },

  async handleAsync<T>(
    promise: Promise<T>,
    context: string,
  ): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  },

  /**
   * Handle async call and return structured error info.
   */
  async handleAsyncWithInfo<T>(
    promise: Promise<T>,
    context: string,
    options?: ErrorInfoOptions,
  ): Promise<{ result: T | null; info: ErrorInfo | null }> {
    try {
      const result = await promise;
      return { result, info: null };
    } catch (error) {
      const info = this.handleWithInfo(error, context, options);
      return { result: null, info };
    }
  },
};
