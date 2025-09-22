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
