import {
  describe, it, expect, vi,
} from 'vitest';
import { Emitter } from '../../src/lib/emitter.js';

describe('Emitter', () => {
  it('calls registered listeners on emit', () => {
    const e = new Emitter();
    const fn = vi.fn();
    e.on('test', fn);
    e.emit('test', 42);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('supports multiple listeners for the same event', () => {
    const e = new Emitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    e.on('evt', fn1);
    e.on('evt', fn2);
    e.emit('evt', 'data');
    expect(fn1).toHaveBeenCalledWith('data');
    expect(fn2).toHaveBeenCalledWith('data');
  });

  it('off() removes a specific listener', () => {
    const e = new Emitter();
    const fn = vi.fn();
    e.on('evt', fn);
    e.off('evt', fn);
    e.emit('evt');
    expect(fn).not.toHaveBeenCalled();
  });

  it('off() on unknown event does not throw', () => {
    const e = new Emitter();
    expect(() => e.off('nope', () => {})).not.toThrow();
  });

  it('removeAllListeners() clears all events', () => {
    const e = new Emitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    e.on('a', fn1);
    e.on('b', fn2);
    e.removeAllListeners();
    e.emit('a');
    e.emit('b');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('emit() with no listeners does not throw', () => {
    const e = new Emitter();
    expect(() => e.emit('nope', 1, 2, 3)).not.toThrow();
  });

  it('passes multiple arguments to listeners', () => {
    const e = new Emitter();
    const fn = vi.fn();
    e.on('multi', fn);
    e.emit('multi', 1, 'two', { three: 3 });
    expect(fn).toHaveBeenCalledWith(1, 'two', { three: 3 });
  });

  it('on() returns the emitter for chaining', () => {
    const e = new Emitter();
    const result = e.on('x', () => {});
    expect(result).toBe(e);
  });
});
