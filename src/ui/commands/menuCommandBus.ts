type MenuCommandHandler = () => void | Promise<void>;

const handlers = new Map<string, MenuCommandHandler>();

export const menuCommandBus = {
  register(id: string, handler: MenuCommandHandler): () => void {
    handlers.set(id, handler);
    return () => {
      if (handlers.get(id) === handler) {
        handlers.delete(id);
      }
    };
  },

  dispatch(id: string): boolean {
    const handler = handlers.get(id);
    if (!handler) return false;
    void handler();
    return true;
  },
};

export type MenuCommandPayload = {
  id: string;
};
