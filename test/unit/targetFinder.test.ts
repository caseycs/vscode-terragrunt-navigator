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
      assert.ok(result!.endsWith('main.tf'));
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
      assert.ok(result!.endsWith('main.tf'));
    });

    it('should fall back to first .tf file when main.tf is not found', async () => {
      const moduleDir = path.join(fixturesDir, 'no-main-tf', 'modules', 'storage');
      const result = await findTargetFile(moduleDir);

      assert.ok(result, 'should find a .tf file even without main.tf');
      assert.ok(result!.endsWith('outputs.tf'), 'should return the alphabetically first .tf file (outputs.tf)');
    });

    it('should still return undefined for directory with no .tf files', async () => {
      const result = await findTargetFile(fixturesDir);
      assert.strictEqual(result, undefined);
    });
  });
});
