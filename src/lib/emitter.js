// Lightweight ESM EventEmitter
// Usage: class Foo extends Emitter { ... }
//   this.emit('event', data)
//   instance.on('event', handler)
//   instance.off('event', handler)

import { forEach } from 'lodash-es';

export class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(fn);
    return this;
  }

  off(event, fn) {
    const fns = this._listeners.get(event);
    if (!fns) return this;
    this._listeners.set(event, fns.filter((f) => f !== fn));
    return this;
  }

  emit(event, ...args) {
    const fns = this._listeners.get(event);
    if (!fns) return;
    forEach(fns, (fn) => fn(...args));
  }

  removeAllListeners() {
    this._listeners.clear();
  }
}
