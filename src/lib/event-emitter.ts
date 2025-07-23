type EventMap = { [key: string]: (...args: any[]) => void };

export class EventEmitter<T extends EventMap> {
  private eventListeners: { [K in keyof T]?: T[K][] } = {};

  on<K extends keyof T>(event: K, listener: T[K]): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event]!.filter(
        (l) => l !== listener
      );
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event]!.forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }
}
