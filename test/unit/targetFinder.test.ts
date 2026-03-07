import * as assert from 'assert';
import * as path from 'path';
import { findTargetFile } from '../../src/resolvers/targetFinder';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');

describe('targetFinder', () => {
  describe('findTargetFile', () => {
    it('should find main.tf in a valid module directory', async () => {
      const moduleDir = path.join(fixturesDir, 'simple', 'modules', 'vpc');
      const result = await findTargetFile(moduleDir);

      assert.ok(result);
      assert.ok(result.endsWith('main.tf'));
    });

    it('should return undefined for non-existent directory', async () => {
      const result = await findTargetFile('/non/existent/path');
      assert.strictEqual(result, undefined);
    });

    it('should return undefined for directory without main.tf', async () => {
      const result = await findTargetFile(fixturesDir);
      assert.strictEqual(result, undefined);
    });

    it('should find main.tf in nested fixture', async () => {
      const moduleDir = path.join(fixturesDir, 'nested', 'modules', 'rds');
      const result = await findTargetFile(moduleDir);

      assert.ok(result);
      assert.ok(result.endsWith('main.tf'));
    });
  });
});
