// Simple LRU cache backed by a Map (insertion-order iteration).
// Map.delete + Map.set moves a key to the end (most recently used).
// Eviction removes the first key (least recently used).

export class LruCache {
  constructor(max) {
    this._max = max;
    this._map = new Map();
  }

  get size() {
    return this._map.size;
  }

  has(key) {
    return this._map.has(key);
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const val = this._map.get(key);
    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, val);
    return val;
  }

  set(key, val) {
    this._map.delete(key);
    this._map.set(key, val);
    if (this._map.size > this._max) {
      this._map.delete(this._map.keys().next().value);
    }
  }

  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }
}
