export interface SaveSchedulerInput {
  path: string;
  content: string;
}

export type SaveSchedulerRetry = () => Promise<void>;

export interface SaveSchedulerPorts {
  save: (input: SaveSchedulerInput) => Promise<void>;
  onScheduled?: (input: SaveSchedulerInput) => void;
  onSaveStarted?: (input: SaveSchedulerInput) => void;
  onSaveSucceeded?: (input: SaveSchedulerInput) => void;
  onSaveFailed?: (
    input: SaveSchedulerInput,
    error: unknown,
    retry: SaveSchedulerRetry,
  ) => void;
}

interface PendingSave {
  input: SaveSchedulerInput;
  timer: ReturnType<typeof setTimeout>;
}

interface RunOptions {
  rejectOnFailure: boolean;
}

export class SaveScheduler {
  private readonly pendingSaves = new Map<string, PendingSave>();
  private readonly debounceMs: number;
  private readonly ports: SaveSchedulerPorts;

  constructor(debounceMs: number, ports: SaveSchedulerPorts) {
    this.debounceMs = debounceMs;
    this.ports = ports;
  }

  schedule(path: string, content: string): void {
    this.scheduleInput({ path, content });
  }

  scheduleInput(input: SaveSchedulerInput): void {
    const { path } = input;
    const existing = this.pendingSaves.get(path);
    if (existing) {
      clearTimeout(existing.timer);
    }

    this.ports.onScheduled?.(input);

    const timer = setTimeout(() => {
      void this.flush(path).catch(() => undefined);
    }, this.debounceMs);

    this.pendingSaves.set(path, { input, timer });
  }

  async flush(path: string): Promise<void> {
    const pending = this.pendingSaves.get(path);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pendingSaves.delete(path);

    await this.runSave(pending.input, { rejectOnFailure: true });
  }

  cancel(path: string): void {
    const pending = this.pendingSaves.get(path);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pendingSaves.delete(path);
  }

  async flushAll(): Promise<void> {
    const paths = Array.from(this.pendingSaves.keys());
    await Promise.all(paths.map((path) => this.flush(path)));
  }

  isPending(path: string): boolean {
    return this.pendingSaves.has(path);
  }

  private async runSave(
    input: SaveSchedulerInput,
    options: RunOptions,
  ): Promise<void> {
    const retry = async (): Promise<void> => {
      await this.runSave(input, { rejectOnFailure: false });
    };

    try {
      this.ports.onSaveStarted?.(input);
      await this.ports.save(input);
      this.ports.onSaveSucceeded?.(input);
    } catch (error) {
      this.ports.onSaveFailed?.(input, error, retry);
      if (options.rejectOnFailure) {
        throw error;
      }
    }
  }
}
