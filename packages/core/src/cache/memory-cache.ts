import type { CacheAdapter } from '../types/common';

export class MemoryCacheAdapter<T> implements CacheAdapter<T> {
  private readonly store = new Map<string, T>();

  public async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  public async set(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
}
