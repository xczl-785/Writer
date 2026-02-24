import { useStatusStore } from '../../state/slices/statusSlice';

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
};
