import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { renderConfigCached, clearRenderCache } from '../../src/resolvers/renderCache';
import { ParsedRenderedConfig } from '../../src/resolvers/terragruntRenderer';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');
const m2Dir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');

function makeFakeResult(label: string): ParsedRenderedConfig {
  return {
    source: undefined,
    dependencies: new Map([['app', `/fake/${label}`]]),
  };
}

describe('renderCache', () => {
  beforeEach(() => {
    clearRenderCache();
  });

  it('should call renderFn on cache miss', async () => {
    let calls = 0;
    const renderFn = async () => {
      calls++;
      return makeFakeResult('first');
    };

    const result = await renderConfigCached(m2Dir, undefined, renderFn);

    assert.strictEqual(calls, 1);
    assert.strictEqual(result.dependencies.get('app'), '/fake/first');
  });

  it('should return cached result when files are unchanged', async () => {
    let calls = 0;
    const renderFn = async () => {
      calls++;
      return makeFakeResult(`call-${calls}`);
    };

    const first = await renderConfigCached(m2Dir, undefined, renderFn);
    const second = await renderConfigCached(m2Dir, undefined, renderFn);

    assert.strictEqual(calls, 1, 'renderFn should only be called once');
    assert.deepStrictEqual(first, second);
  });

  it('should invalidate when terragrunt.hcl content changes', async () => {
    const hclPath = path.join(m2Dir, 'terragrunt.hcl');
    const original = fs.readFileSync(hclPath, 'utf-8');

    let calls = 0;
    const renderFn = async () => {
      calls++;
      return makeFakeResult(`call-${calls}`);
    };

    try {
      await renderConfigCached(m2Dir, undefined, renderFn);
      assert.strictEqual(calls, 1);

      // Mutate the file
      fs.writeFileSync(hclPath, original + '\n# cache-bust');

      const result = await renderConfigCached(m2Dir, undefined, renderFn);
      assert.strictEqual(calls, 2, 'renderFn should be called again after file change');
      assert.strictEqual(result.dependencies.get('app'), '/fake/call-2');
    } finally {
      fs.writeFileSync(hclPath, original);
    }
  });

  it('should invalidate when parent config file changes', async () => {
    const parentPath = path.join(fixturesDir, 'with-deps', 'path_vars.hcl');
    const original = fs.readFileSync(parentPath, 'utf-8');

    let calls = 0;
    const renderFn = async () => {
      calls++;
      return makeFakeResult(`call-${calls}`);
    };

    try {
      await renderConfigCached(m2Dir, undefined, renderFn);
      assert.strictEqual(calls, 1);

      // Mutate the parent file
      fs.writeFileSync(parentPath, original + '\n# cache-bust');

      const result = await renderConfigCached(m2Dir, undefined, renderFn);
      assert.strictEqual(calls, 2, 'renderFn should be called again after parent file change');
      assert.strictEqual(result.dependencies.get('app'), '/fake/call-2');
    } finally {
      fs.writeFileSync(parentPath, original);
    }
  });

  it('should not cache on render failure', async () => {
    let calls = 0;
    const renderFn = async () => {
      calls++;
      if (calls === 1) {
        throw new Error('render failed');
      }
      return makeFakeResult('success');
    };

    await assert.rejects(() => renderConfigCached(m2Dir, undefined, renderFn));
    assert.strictEqual(calls, 1);

    const result = await renderConfigCached(m2Dir, undefined, renderFn);
    assert.strictEqual(calls, 2, 'renderFn should be called again after failure');
    assert.strictEqual(result.dependencies.get('app'), '/fake/success');
  });

  it('should force fresh render after clearRenderCache', async () => {
    let calls = 0;
    const renderFn = async () => {
      calls++;
      return makeFakeResult(`call-${calls}`);
    };

    await renderConfigCached(m2Dir, undefined, renderFn);
    assert.strictEqual(calls, 1);

    clearRenderCache();

    const result = await renderConfigCached(m2Dir, undefined, renderFn);
    assert.strictEqual(calls, 2, 'renderFn should be called again after cache clear');
    assert.strictEqual(result.dependencies.get('app'), '/fake/call-2');
  });
});
