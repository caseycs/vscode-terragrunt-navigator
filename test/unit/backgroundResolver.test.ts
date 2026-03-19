import * as assert from 'assert';
import { SourceReference } from '../../src/types';
import { BackgroundResolver, ResolveFn, refKey } from '../../src/resolvers/backgroundResolver';

function makeRef(
  kind: 'source' | 'config_path' | 'find_in_parent',
  value: string,
  startOffset: number,
  endOffset: number,
  blockName?: string
): SourceReference {
  return { kind, value, startOffset, endOffset, blockName };
}

function makeRenderRef(startOffset: number, endOffset: number, blockName?: string): SourceReference {
  return makeRef('config_path', '${some_func()}/path', startOffset, endOffset, blockName);
}

function immediateResolveFn(result: string): ResolveFn {
  return async () => result;
}

function delayedResolveFn(result: string, ms: number): ResolveFn {
  return () => new Promise((resolve) => setTimeout(() => resolve(result), ms));
}

function trackingResolveFn(results: Map<string, string>): { fn: ResolveFn; calls: SourceReference[] } {
  const calls: SourceReference[] = [];
  const fn: ResolveFn = async (ref) => {
    calls.push(ref);
    return results.get(refKey(ref));
  };
  return { fn, calls };
}

describe('BackgroundResolver', () => {
  describe('filtering', () => {
    it('should only queue refs that need terragrunt render (have interpolations)', () => {
      const refs: SourceReference[] = [
        makeRef('config_path', '../simple', 0, 9),
        makeRef('config_path', '${some_func()}/path', 20, 40),
        makeRef('source', '../../modules/app', 50, 70),
        makeRef('source', '${get_env("FOO")}/mod', 80, 100),
        makeRef('find_in_parent', 'common.hcl', 110, 120),
      ];

      const resolver = new BackgroundResolver(refs, '/tmp/test');
      assert.strictEqual(resolver.queueSize, 2);
    });

    it('should not queue find_in_parent refs even with interpolation-like values', () => {
      const refs: SourceReference[] = [
        makeRef('find_in_parent', 'common.hcl', 0, 10),
      ];

      const resolver = new BackgroundResolver(refs, '/tmp/test');
      assert.strictEqual(resolver.queueSize, 0);
    });

    it('should not queue refs using get_repo_root (resolved statically)', () => {
      const refs: SourceReference[] = [
        makeRef('config_path', '${get_repo_root()}/tg/m1', 0, 25),
      ];

      const resolver = new BackgroundResolver(refs, '/tmp/test');
      assert.strictEqual(resolver.queueSize, 0);
    });
  });

  describe('cancellation', () => {
    it('should report cancelled state after cancel()', () => {
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.isCancelled, false);

      resolver.cancel();
      assert.strictEqual(resolver.isCancelled, true);
    });
  });

  describe('isRenderRef', () => {
    it('should return true for refs with interpolations', () => {
      const ref = makeRef('config_path', '${some_func()}/path', 0, 20);
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.isRenderRef(ref), true);
    });

    it('should return false for static refs', () => {
      const ref = makeRef('config_path', '../simple', 0, 9);
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.isRenderRef(ref), false);
    });

    it('should return false for find_in_parent refs', () => {
      const ref = makeRef('find_in_parent', 'common.hcl', 0, 10);
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.isRenderRef(ref), false);
    });

    it('should return false for get_repo_root refs', () => {
      const ref = makeRef('config_path', '${get_repo_root()}/tg/m1', 0, 25);
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.isRenderRef(ref), false);
    });
  });

  describe('start', () => {
    it('should resolve all queued refs sequentially', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const ref2 = makeRenderRef(30, 50, 'dep2');
      const results = new Map([
        [refKey(ref1), '/resolved/dep1'],
        [refKey(ref2), '/resolved/dep2'],
      ]);
      const { fn, calls } = trackingResolveFn(results);

      const resolver = new BackgroundResolver([ref1, ref2], '/tmp/test', undefined, fn);
      await resolver.start();

      assert.strictEqual(calls.length, 2);
      assert.strictEqual(resolver.hasResult(refKey(ref1)), true);
      assert.strictEqual(resolver.getResult(refKey(ref1)), '/resolved/dep1');
      assert.strictEqual(resolver.hasResult(refKey(ref2)), true);
      assert.strictEqual(resolver.getResult(refKey(ref2)), '/resolved/dep2');
    });

    it('should stop processing when cancelled', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const ref2 = makeRenderRef(30, 50, 'dep2');

      let resolver: BackgroundResolver;
      const fn: ResolveFn = async (ref) => {
        // Cancel after first ref is resolved
        resolver.cancel();
        return `/resolved/${ref.blockName}`;
      };

      resolver = new BackgroundResolver([ref1, ref2], '/tmp/test', undefined, fn);
      await resolver.start();

      // First ref resolved before cancel took effect
      assert.strictEqual(resolver.hasResult(refKey(ref1)), true);
      // Second ref should NOT be resolved
      assert.strictEqual(resolver.hasResult(refKey(ref2)), false);
    });

    it('should store undefined on resolve failure', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const fn: ResolveFn = async () => {
        throw new Error('render failed');
      };

      const resolver = new BackgroundResolver([ref1], '/tmp/test', undefined, fn);
      await resolver.start();

      assert.strictEqual(resolver.hasResult(refKey(ref1)), true);
      assert.strictEqual(resolver.getResult(refKey(ref1)), undefined);
    });
  });

  describe('resolveNow', () => {
    it('should return cached result for already-resolved ref', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const ref2 = makeRenderRef(30, 50, 'dep2');
      const results = new Map([
        [refKey(ref1), '/resolved/dep1'],
        [refKey(ref2), '/resolved/dep2'],
      ]);
      const { fn, calls } = trackingResolveFn(results);

      const resolver = new BackgroundResolver([ref1, ref2], '/tmp/test', undefined, fn);
      await resolver.start();

      // Reset call tracking
      calls.length = 0;

      // resolveNow on already-resolved ref should NOT call resolveFn again
      const result = await resolver.resolveNow(ref1);
      assert.strictEqual(result, '/resolved/dep1');
      assert.strictEqual(calls.length, 0);
    });

    it('should wait for currently-resolving ref', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');

      let resolveRef1: ((value: string | undefined) => void) | undefined;
      let callCount = 0;
      let fnCalledResolve: () => void;
      const fnCalledPromise = new Promise<void>((r) => { fnCalledResolve = r; });

      const fn: ResolveFn = (ref) => {
        callCount++;
        // Signal that fn was called
        fnCalledResolve();
        // Block resolution until we manually resolve it
        return new Promise<string | undefined>((resolve) => {
          resolveRef1 = resolve;
        });
      };

      // Only one ref — so callCount can only be 1 or 2
      const resolver = new BackgroundResolver([ref1], '/tmp/test', undefined, fn);

      // Start background — it will block on ref1
      const startPromise = resolver.start();

      // Wait until fn is actually called for ref1 (deterministic, not time-based)
      await fnCalledPromise;

      // ref1 is currently being resolved — resolveNow should wait, not call fn again
      const resolveNowPromise = resolver.resolveNow(ref1);

      // Complete ref1 resolution
      assert.ok(resolveRef1, 'resolveRef1 callback should be set');
      resolveRef1!('/resolved/dep1');

      const result = await resolveNowPromise;
      assert.strictEqual(result, '/resolved/dep1');

      // resolveFn should have been called only once (by start), not again by resolveNow
      assert.strictEqual(callCount, 1);

      await startPromise;
    });

    it('should cancel background and resolve immediately for not-yet-processed ref', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const ref2 = makeRenderRef(30, 50, 'dep2');
      const ref3 = makeRenderRef(60, 80, 'dep3');

      let resolveRef1: ((value: string | undefined) => void) | undefined;

      // Use a non-async function to avoid double promise wrapping
      const fn: ResolveFn = (ref) => {
        if (refKey(ref) === refKey(ref1)) {
          return new Promise<string | undefined>((resolve) => {
            resolveRef1 = resolve;
          });
        }
        return Promise.resolve(`/resolved/${ref.blockName}`);
      };

      const resolver = new BackgroundResolver([ref1, ref2, ref3], '/tmp/test', undefined, fn);

      // Start background — it will block on ref1
      const startPromise = resolver.start();

      // Wait a tick for start() to begin resolving ref1
      await new Promise((r) => setTimeout(r, 10));

      // ref3 is not yet processed — resolveNow should cancel background and resolve directly
      const result = await resolver.resolveNow(ref3);

      assert.strictEqual(result, '/resolved/dep3');
      assert.strictEqual(resolver.isCancelled, true);

      // ref2 should NOT have been resolved (background was cancelled)
      assert.strictEqual(resolver.hasResult(refKey(ref2)), false);

      // Unblock ref1 so start() can finish
      resolveRef1!('/resolved/dep1');
      await startPromise;
    });

    it('should store undefined and return undefined on resolve failure', async () => {
      const ref1 = makeRenderRef(0, 20, 'dep1');
      const fn: ResolveFn = async () => {
        throw new Error('render failed');
      };

      const resolver = new BackgroundResolver([ref1], '/tmp/test', undefined, fn);

      const result = await resolver.resolveNow(ref1);
      assert.strictEqual(result, undefined);
      assert.strictEqual(resolver.hasResult(refKey(ref1)), true);
    });
  });

  describe('result tracking', () => {
    it('should not have results before start', () => {
      const resolver = new BackgroundResolver([], '/tmp/test');
      assert.strictEqual(resolver.hasResult('0:10'), false);
      assert.strictEqual(resolver.getResult('0:10'), undefined);
    });
  });
});
