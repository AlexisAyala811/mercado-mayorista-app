import { MemoryCache } from './memory-cache.js';

// Spec 013.
describe('MemoryCache', () => {
  it('reads once and serves the next reads from memory until it expires', async () => {
    let time = 1_000;
    const cache = new MemoryCache<string>(60_000, 10, () => time);
    const load = jest.fn().mockResolvedValue('página');

    expect(await cache.remember('negocio:providers', '50:0', load)).toBe('página');
    expect(await cache.remember('negocio:providers', '50:0', load)).toBe('página');
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toEqual({ entries: 1, hits: 1, misses: 1 });

    time += 60_000;
    await cache.remember('negocio:providers', '50:0', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps each scope and each page apart', async () => {
    const cache = new MemoryCache<string>(60_000);
    expect(await cache.remember('a:providers', '50:0', async () => 'A')).toBe('A');
    expect(await cache.remember('b:providers', '50:0', async () => 'B')).toBe('B');
    expect(await cache.remember('a:providers', '50:50', async () => 'A2')).toBe('A2');
    expect(await cache.remember('a:providers', '50:0', async () => 'otra')).toBe('A');
  });

  it('drops only the invalidated scope', async () => {
    const cache = new MemoryCache<string>(60_000);
    await cache.remember('a:providers', '50:0', async () => 'viejo');
    await cache.remember('a:buyers', '50:0', async () => 'compradores');
    cache.invalidate('a:providers');
    expect(await cache.remember('a:providers', '50:0', async () => 'nuevo')).toBe('nuevo');
    expect(await cache.remember('a:buyers', '50:0', async () => 'otro')).toBe('compradores');
  });

  it('does not store what was read while the scope changed', async () => {
    const cache = new MemoryCache<string>(60_000);
    let finish!: (value: string) => void;
    const slow = cache.remember('a:providers', '50:0', () => new Promise<string>((resolve) => { finish = resolve; }));
    cache.invalidate('a:providers');
    finish('leído antes del cambio');
    expect(await slow).toBe('leído antes del cambio');
    expect(await cache.remember('a:providers', '50:0', async () => 'actual')).toBe('actual');
  });

  it('removes the oldest entries when it is full, and does nothing when turned off', async () => {
    const small = new MemoryCache<number>(60_000, 2);
    await small.remember('s', '1', async () => 1);
    await small.remember('s', '2', async () => 2);
    await small.remember('s', '3', async () => 3);
    expect(small.stats().entries).toBe(2);
    expect(await small.remember('s', '1', async () => 10)).toBe(10);

    const off = new MemoryCache<number>(0);
    const load = jest.fn().mockResolvedValue(1);
    await off.remember('s', '1', load);
    await off.remember('s', '1', load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(off.stats().entries).toBe(0);
  });
});
