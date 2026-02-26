import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import pollUntil from '../../src/lib/poll.js';

describe('pollUntil', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves immediately when predicate returns truthy on first call', async () => {
    const result = pollUntil(() => 'found', 100, 5000);
    await expect(result).resolves.toBe('found');
  });

  it('resolves after polling when predicate becomes truthy', async () => {
    let count = 0;
    const predicate = () => {
      count += 1;
      return count >= 3 ? 'done' : null;
    };

    const promise = pollUntil(predicate, 50, 5000);

    // Advance through polling intervals
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).resolves.toBe('done');
  });

  it('rejects with timeout error when predicate never returns truthy', async () => {
    const promise = pollUntil(() => null, 50, 200);

    // Catch the rejection early to avoid unhandled rejection warning
    const rejection = promise.catch((e) => e);

    await vi.advanceTimersByTimeAsync(250);

    const err = await rejection;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Poll timed out after 0.2s');
  });

  it('clears interval and timeout on success', async () => {
    let count = 0;
    const predicate = () => {
      count += 1;
      return count >= 2 ? 'ok' : null;
    };

    const promise = pollUntil(predicate, 50, 5000);
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toBe('ok');

    // After resolve, no more calls should happen
    const countAfter = count;
    await vi.advanceTimersByTimeAsync(200);
    expect(count).toBe(countAfter);
  });
});
