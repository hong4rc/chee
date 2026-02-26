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
});
