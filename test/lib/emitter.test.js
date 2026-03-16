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

  it('off() removes only the specified listener, others still fire', () => {
    const e = new Emitter();
    const kept = vi.fn();
    const removed = vi.fn();
    e.on('evt', kept);
    e.on('evt', removed);
    e.off('evt', removed);
    e.emit('evt', 'payload');
    expect(kept).toHaveBeenCalledWith('payload');
    expect(removed).not.toHaveBeenCalled();
  });

  it('off() with non-existent listener does not throw', () => {
    const e = new Emitter();
    const registered = vi.fn();
    const stranger = vi.fn();
    e.on('evt', registered);
    expect(() => e.off('evt', stranger)).not.toThrow();
    e.emit('evt');
    expect(registered).toHaveBeenCalledOnce();
  });

  it('after off(), re-adding the same listener works', () => {
    const e = new Emitter();
    const fn = vi.fn();
    e.on('evt', fn);
    e.off('evt', fn);
    e.emit('evt');
    expect(fn).not.toHaveBeenCalled();

    e.on('evt', fn);
    e.emit('evt', 'back');
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('back');
  });

  it('multiple listeners — removing one does not affect others', () => {
    const e = new Emitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();
    e.on('evt', fn1);
    e.on('evt', fn2);
    e.on('evt', fn3);
    e.off('evt', fn2);
    e.emit('evt', 'ok');
    expect(fn1).toHaveBeenCalledWith('ok');
    expect(fn2).not.toHaveBeenCalled();
    expect(fn3).toHaveBeenCalledWith('ok');
  });
});
