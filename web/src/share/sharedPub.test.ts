import { describe, expect, it } from 'vitest';
import { withSharedPubLock } from './sharedPub';

/** A manually-resolvable promise — the only synchronization primitive these
 *  tests use, so ordering is deterministic (no real timers, no randomness). */
function deferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('withSharedPubLock', () => {
  it('serializes criticals: the second does not start until the first settles', async () => {
    const order: string[] = [];
    const gate1 = deferred();

    let secondStarted = false;

    const first = withSharedPubLock(async () => {
      order.push('start1');
      await gate1.promise; // hold the lock until we release it
      order.push('finish1');
    });

    const second = withSharedPubLock(async () => {
      secondStarted = true;
      order.push('start2');
      order.push('finish2');
    });

    // Let all currently-schedulable microtasks drain. The first critical is
    // parked on gate1; the second must NOT have started yet.
    await Promise.resolve();
    await Promise.resolve();
    expect(secondStarted).toBe(false);
    expect(order).toEqual(['start1']);

    // Release the first critical; only now may the second run.
    gate1.resolve();
    await Promise.all([first, second]);

    expect(secondStarted).toBe(true);
    // Strictly non-interleaved: first fully finishes before second starts.
    expect(order).toEqual(['start1', 'finish1', 'start2', 'finish2']);
  });

  it('a rejected critical does not wedge the lock for later callers', async () => {
    const boom = new Error('critical A failed');

    const a = withSharedPubLock(async () => {
      throw boom;
    });

    let bRan = false;
    const b = withSharedPubLock(async () => {
      bRan = true;
      return 'B ok';
    });

    await expect(a).rejects.toBe(boom); // caller can catch A's rejection
    await expect(b).resolves.toBe('B ok'); // B still runs afterward
    expect(bRan).toBe(true);
  });

  it('passes the critical section return value through', async () => {
    await expect(withSharedPubLock(() => Promise.resolve(42))).resolves.toBe(42);
  });
});
