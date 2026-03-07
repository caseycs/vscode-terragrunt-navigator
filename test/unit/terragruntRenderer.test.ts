import * as assert from 'assert';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseRenderedConfig, renderConfig } from '../../src/resolvers/terragruntRenderer';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');

describe('terragruntRenderer', () => {
  describe('parseRenderedConfig', () => {
    it('should extract resolved config_path from terragrunt render --json', function () {
      this.timeout(30_000);

      const m2Dir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');
      const output = execSync('terragrunt render --json', {
        cwd: m2Dir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const jsonLine = output.trim().split('\n').pop()!;

      const result = parseRenderedConfig(jsonLine);

      assert.strictEqual(result.dependencies.size, 1);
      assert.strictEqual(
        result.dependencies.get('app'),
        path.join(fixturesDir, 'with-deps', 'tg', 'm1'),
      );
    });

    it('should resolve config_path with dynamic locals from regex', function () {
      this.timeout(30_000);

      const computeDir = path.join(
        fixturesDir, 'with-deps-dynamic', 'gcp-myproject-us-east1', 'compute',
      );
      const output = execSync('terragrunt render --json', {
        cwd: computeDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const jsonLine = output.trim().split('\n').pop()!;

      const result = parseRenderedConfig(jsonLine);

      assert.strictEqual(result.dependencies.size, 1);
      assert.strictEqual(
        result.dependencies.get('network'),
        path.join(fixturesDir, 'with-deps-dynamic', 'gcp-myproject-us-east1', 'network'),
      );
    });

    it('should extract resolved source from terraform block', () => {
      const json = JSON.stringify({
        terraform: { source: '/repo/modules/app///.' },
        dependency: {},
      });

      const result = parseRenderedConfig(json);

      assert.strictEqual(result.source, '/repo/modules/app///.');
    });

    it('should return empty results when no dependency/terraform blocks exist', () => {
      const json = JSON.stringify({ locals: { foo: 'bar' } });

      const result = parseRenderedConfig(json);

      assert.strictEqual(result.source, undefined);
      assert.strictEqual(result.dependencies.size, 0);
    });

    it('should handle multiple dependencies', () => {
      const json = JSON.stringify({
        dependency: {
          vpc: { config_path: '/repo/tg/vpc' },
          rds: { config_path: '/repo/tg/rds' },
          ecs: { config_path: '/repo/tg/ecs' },
        },
      });

      const result = parseRenderedConfig(json);

      assert.strictEqual(result.dependencies.size, 3);
      assert.strictEqual(result.dependencies.get('vpc'), '/repo/tg/vpc');
      assert.strictEqual(result.dependencies.get('rds'), '/repo/tg/rds');
      assert.strictEqual(result.dependencies.get('ecs'), '/repo/tg/ecs');
    });

    it('should handle missing/null fields gracefully', () => {
      const json = JSON.stringify({
        terraform: { source: null },
        dependency: {
          app: { config_path: null },
          vpc: {},
        },
      });

      const result = parseRenderedConfig(json);

      assert.strictEqual(result.source, undefined);
      assert.strictEqual(result.dependencies.size, 0);
    });
  });

  describe('renderConfig', () => {
    it('should cancel previous render when called again for the same directory', async function () {
      this.timeout(30_000);

      const m2Dir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');

      // Fire two renders for the same dir — first should be killed
      const first = renderConfig(m2Dir);
      const second = renderConfig(m2Dir);

      const results = await Promise.allSettled([first, second]);

      assert.strictEqual(results[0].status, 'rejected', 'first render should be killed');
      assert.strictEqual(results[1].status, 'fulfilled', 'second render should succeed');

      if (results[1].status === 'fulfilled') {
        assert.strictEqual(results[1].value.dependencies.size, 1);
      }
    });
  });
});
