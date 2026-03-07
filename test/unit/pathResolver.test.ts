import * as assert from 'assert';
import * as path from 'path';
import { resolveSourcePath, getRepoRoot, findGitRoot } from '../../src/resolvers/pathResolver';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');

describe('pathResolver', () => {
  describe('resolveSourcePath with ${get_repo_root()}', () => {
    it('should resolve get_repo_root source with double-slash and subdir', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/aws-powerbi-gateway///.',
        '/project/terragrunt/ec2',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/aws-powerbi-gateway'));
    });

    it('should resolve get_repo_root source with double-slash only', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/vpc///',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/vpc'));
    });

    it('should resolve get_repo_root source without double-slash', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/vpc',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/vpc'));
    });

    it('should resolve get_repo_root using findGitRoot when repoRoot not provided', () => {
      const documentDir = path.join(fixturesDir, 'simple');
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/vpc///.',
        documentDir
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(
        result.absolutePath,
        path.resolve(fixturesDir, 'simple', 'modules', 'vpc')
      );
    });

    it('should resolve get_repo_root with trailing slash only', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/m1/',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/m1'));
    });

    it('should resolve get_repo_root with bare double-slash (no subdir after)', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/m1//',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/m1'));
    });

    it('should resolve get_repo_root with no trailing slash', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/m1',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/m1'));
    });

    it('should resolve get_repo_root with deeply nested module path', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/aws/networking/vpc///.',
        '/project/terragrunt/prod',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/aws/networking/vpc'));
    });

    it('should resolve get_repo_root with subdir after double-slash', () => {
      const repoRoot = '/project';
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/m1//submodule',
        '/project/live/env',
        repoRoot
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/modules/m1'));
    });

    it('should handle nested directory with get_repo_root', () => {
      const documentDir = path.join(fixturesDir, 'nested', 'env');
      const result = resolveSourcePath(
        '${get_repo_root()}/modules/rds///.',
        documentDir
      );

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(
        result.absolutePath,
        path.resolve(fixturesDir, 'nested', 'modules', 'rds')
      );
    });
  });

  describe('resolveSourcePath with relative paths', () => {
    it('should resolve double-slash path', () => {
      const documentDir = '/project/live/env';
      const result = resolveSourcePath('..//modules/vpc', documentDir);

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/live/modules/vpc'));
    });

    it('should resolve simple relative path without double-slash', () => {
      const documentDir = '/project/live/env';
      const result = resolveSourcePath('../modules/vpc', documentDir);

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/live/modules/vpc'));
    });

    it('should handle deep double-slash paths', () => {
      const documentDir = '/project/live/us-east-1/dev';
      const result = resolveSourcePath('../..//modules/aws-powerbi-gateway', documentDir);

      assert.strictEqual(result.isRemote, false);
      assert.strictEqual(result.absolutePath, path.resolve('/project/live/modules/aws-powerbi-gateway'));
    });
  });

  describe('resolveSourcePath with remote sources', () => {
    it('should detect git:: remote sources', () => {
      const result = resolveSourcePath('git::https://example.com/modules.git//vpc', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect https:// remote sources', () => {
      const result = resolveSourcePath('https://example.com/modules', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect s3:: remote sources', () => {
      const result = resolveSourcePath('s3::https://bucket/module.zip', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect gcs:: remote sources', () => {
      const result = resolveSourcePath('gcs::https://bucket/module.zip', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect tfr:// remote sources', () => {
      const result = resolveSourcePath('tfr://registry/module', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect registry.terraform.io remote sources', () => {
      const result = resolveSourcePath('registry.terraform.io/modules/vpc', '/any');
      assert.strictEqual(result.isRemote, true);
    });

    it('should detect github.com remote sources', () => {
      const result = resolveSourcePath('github.com/org/repo//modules/vpc', '/any');
      assert.strictEqual(result.isRemote, true);
    });
  });

  describe('findGitRoot', () => {
    it('should find .git dir in simple fixture', () => {
      const result = findGitRoot(path.join(fixturesDir, 'simple'));
      assert.strictEqual(result, path.join(fixturesDir, 'simple'));
    });

    it('should find .git dir from nested subdirectory', () => {
      const result = findGitRoot(path.join(fixturesDir, 'nested', 'env'));
      assert.strictEqual(result, path.join(fixturesDir, 'nested'));
    });

    it('should return undefined when no .git found', () => {
      const result = findGitRoot('/');
      assert.strictEqual(result, undefined);
    });
  });

  describe('getRepoRoot', () => {
    it('should find git root for get_repo_root sources', () => {
      const documentDir = path.join(fixturesDir, 'simple');
      const result = getRepoRoot(documentDir, '${get_repo_root()}/modules/vpc///.');
      assert.strictEqual(result, path.join(fixturesDir, 'simple'));
    });

    it('should return the resolved prefix for relative double-slash paths', () => {
      const documentDir = '/project/live/env';
      const result = getRepoRoot(documentDir, '..//modules/vpc');
      assert.strictEqual(result, path.resolve('/project/live'));
    });

    it('should return undefined for paths without double-slash', () => {
      const result = getRepoRoot('/project/live/env', '../modules/vpc');
      assert.strictEqual(result, undefined);
    });

    it('should handle deep relative prefixes', () => {
      const documentDir = '/project/live/us-east-1/dev';
      const result = getRepoRoot(documentDir, '../..//modules/vpc');
      assert.strictEqual(result, path.resolve('/project/live'));
    });
  });
});
