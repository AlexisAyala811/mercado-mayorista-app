import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MemoryCache } from '../common/cache/memory-cache.js';

export type CatalogKind = 'buyers' | 'providers' | 'varieties';

// Spec 013: pages of the catalogs, kept apart by business and by catalog.
// Only reference lists are cached: never balances, accounts or histories.
@Injectable()
export class CatalogCache {
  private readonly cache: MemoryCache<unknown>;

  constructor(@Optional() config?: ConfigService) {
    const seconds = Number(config?.get('CATALOG_CACHE_TTL_SECONDS') ?? 60);
    this.cache = new MemoryCache(seconds * 1000);
  }

  remember<Value>(
    businessId: string,
    kind: CatalogKind,
    page: { limit: number; offset: number },
    load: () => Promise<Value>,
  ): Promise<Value> {
    return this.cache.remember(
      `${businessId}:${kind}`,
      `${page.limit}:${page.offset}`,
      load,
    ) as Promise<Value>;
  }

  invalidate(businessId: string, kind: CatalogKind) {
    this.cache.invalidate(`${businessId}:${kind}`);
  }

  stats() {
    return this.cache.stats();
  }
}
