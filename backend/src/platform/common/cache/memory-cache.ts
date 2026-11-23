// Spec 013: a small cache in the memory of this process. Entries expire by
// time, the oldest leave when it is full, and a whole scope can be invalidated.
//
// A value that was being read while its scope changed is never stored: each
// scope has a version, and `remember` only keeps what it read if the version
// is still the one it started with.
export class MemoryCache<Value> {
  private readonly entries = new Map<
    string,
    { expiresAt: number; scope: string; value: Value }
  >();
  private readonly versions = new Map<string, number>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get enabled() {
    return this.ttlMs > 0;
  }

  async remember(
    scope: string,
    key: string,
    load: () => Promise<Value>,
  ): Promise<Value> {
    if (!this.enabled) return load();
    const id = `${scope}|${key}`;
    const found = this.entries.get(id);
    if (found && found.expiresAt > this.now()) {
      this.hits += 1;
      return found.value;
    }
    this.misses += 1;
    const version = this.versions.get(scope) ?? 0;
    const value = await load();
    if ((this.versions.get(scope) ?? 0) === version) {
      this.entries.delete(id);
      this.entries.set(id, {
        expiresAt: this.now() + this.ttlMs,
        scope,
        value,
      });
      while (this.entries.size > this.maxEntries) {
        const oldest = this.entries.keys().next().value;
        if (oldest === undefined) break;
        this.entries.delete(oldest);
      }
    }
    return value;
  }

  invalidate(scope: string) {
    this.versions.set(scope, (this.versions.get(scope) ?? 0) + 1);
    for (const [id, entry] of this.entries)
      if (entry.scope === scope) this.entries.delete(id);
  }

  stats() {
    return { entries: this.entries.size, hits: this.hits, misses: this.misses };
  }
}
