/** Instance-scoped, bounded cache. Concurrent misses share one load; failures are retried. */
export class AsyncCache {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(
    private readonly ttlMs = 10 * 60 * 1000,
    private readonly maxEntries = 512,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) return structuredClone(entry.value) as T;
    this.entries.delete(key);

    let request = this.pending.get(key) as Promise<T> | undefined;
    if (!request) {
      request = Promise.resolve().then(load).then((value) => {
        if (this.maxEntries > 0) {
          if (this.entries.size >= this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest !== undefined) this.entries.delete(oldest);
          }
          this.entries.set(key, { value: structuredClone(value), expiresAt: this.now() + this.ttlMs });
        }
        return value;
      }).finally(() => this.pending.delete(key));
      this.pending.set(key, request);
    }
    return structuredClone(await request);
  }
}
