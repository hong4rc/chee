import { describe, it, expect } from 'vitest';
import { LruCache } from '../../src/lib/lru.js';

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const c = new LruCache(3);
    c.set('a', 1);
    c.set('b', 2);
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBe(2);
    expect(c.size).toBe(2);
  });

  it('returns undefined for missing keys', () => {
    const c = new LruCache(3);
    expect(c.get('x')).toBeUndefined();
  });

  it('evicts least recently used when capacity exceeded', () => {
    const c = new LruCache(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3); // evicts 'a'
    expect(c.has('a')).toBe(false);
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });

  it('get() refreshes LRU ordering', () => {
    const c = new LruCache(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // refresh 'a' — now 'b' is LRU
    c.set('c', 3); // evicts 'b'
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.has('c')).toBe(true);
  });

  it('set() with existing key updates value without growing', () => {
    const c = new LruCache(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('a', 10);
    expect(c.size).toBe(2);
    expect(c.get('a')).toBe(10);
  });

  it('delete() removes a key', () => {
    const c = new LruCache(3);
    c.set('a', 1);
    c.delete('a');
    expect(c.has('a')).toBe(false);
    expect(c.size).toBe(0);
  });

  it('clear() removes all entries', () => {
    const c = new LruCache(3);
    c.set('a', 1);
    c.set('b', 2);
    c.clear();
    expect(c.size).toBe(0);
    expect(c.get('a')).toBeUndefined();
  });

  describe('eviction behavior', () => {
    it('evicts oldest and continues evicting correctly', () => {
      const c = new LruCache(3);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      c.set('d', 4); // evicts 'a'
      expect(c.has('a')).toBe(false);
      c.set('e', 5); // evicts 'b'
      expect(c.has('b')).toBe(false);
      expect(c.get('c')).toBe(3);
      expect(c.get('d')).toBe(4);
      expect(c.get('e')).toBe(5);
    });

    it('get() on evicted key returns undefined', () => {
      const c = new LruCache(2);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3); // evicts 'a'
      expect(c.get('a')).toBeUndefined();
      expect(c.has('a')).toBe(false);
    });

    it('get() promotes key — evicts next oldest instead', () => {
      const c = new LruCache(3);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      c.get('a'); // promote 'a', now 'b' is oldest
      c.set('d', 4); // evicts 'b'
      expect(c.has('a')).toBe(true);
      expect(c.has('b')).toBe(false);
      c.set('e', 5); // evicts 'c' (next oldest)
      expect(c.has('c')).toBe(false);
      expect(c.has('a')).toBe(true);
    });

    it('set() on existing key promotes it', () => {
      const c = new LruCache(3);
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      c.set('a', 10); // promote 'a', now 'b' is oldest
      c.set('d', 4); // evicts 'b'
      expect(c.has('b')).toBe(false);
      expect(c.get('a')).toBe(10);
    });

    it('size stays at capacity through multiple evictions', () => {
      const c = new LruCache(2);
      c.set('a', 1);
      c.set('b', 2);
      expect(c.size).toBe(2);
      c.set('c', 3);
      expect(c.size).toBe(2);
      c.set('d', 4);
      expect(c.size).toBe(2);
      c.set('e', 5);
      expect(c.size).toBe(2);
      expect(c.has('d')).toBe(true);
      expect(c.has('e')).toBe(true);
    });
  });
});
