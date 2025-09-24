export interface KeyValueStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalStorageAdapter implements KeyValueStorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }
}

export class JsonStorage<T> {
  constructor(private adapter: KeyValueStorageAdapter, private key: string) {}

  read(defaultValue: T): T {
    try {
      const raw = this.adapter.getItem(this.key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  write(value: T) {
    try {
      this.adapter.setItem(this.key, JSON.stringify(value));
    } catch {}
  }
}

// Broadcast utility for multi-tab coherence
export class BroadcastBus<T = any> {
  private channel?: BroadcastChannel;
  constructor(private name: string) {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(name);
      } catch {}
    }
  }
  post(message: T) {
    try {
      this.channel?.postMessage(message as any);
    } catch {}
  }
  subscribe(handler: (message: T) => void) {
    if (!this.channel) return () => {};
    const listener = (ev: MessageEvent) => handler(ev.data as T);
    this.channel.addEventListener("message", listener as any);
    return () => this.channel?.removeEventListener("message", listener as any);
  }
}
