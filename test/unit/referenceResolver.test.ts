import * as assert from 'assert';
import * as path from 'path';
import { resolveReference } from '../../src/resolvers/referenceResolver';
import { SourceReference } from '../../src/types';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');

describe('referenceResolver', () => {
  describe('find_in_parent', () => {
    it('should resolve find_in_parent_folders to the file in an ancestor directory', async () => {
      const ref: SourceReference = {
        kind: 'find_in_parent',
        value: 'path_vars.hcl',
        startOffset: 0,
        endOffset: 13,
      };
      const documentDir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');

      const result = await resolveReference(ref, documentDir);

      assert.strictEqual(result, path.join(fixturesDir, 'with-deps', 'path_vars.hcl'));
    });

    it('should return undefined when file is not found in any parent', async () => {
      const ref: SourceReference = {
        kind: 'find_in_parent',
        value: 'nonexistent_file.hcl',
        startOffset: 0,
        endOffset: 20,
      };
      const documentDir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');

      const result = await resolveReference(ref, documentDir);

      assert.strictEqual(result, undefined);
    });

    it('should skip the current directory', async () => {
      const ref: SourceReference = {
        kind: 'find_in_parent',
        value: 'terragrunt.hcl',
        startOffset: 0,
        endOffset: 14,
      };
      // m2 has its own terragrunt.hcl, but find_in_parent should skip it
      // and find m1's terragrunt.hcl (in tg/ parent there is none, so it won't find one)
      const documentDir = path.join(fixturesDir, 'with-deps', 'tg', 'm2');

      const result = await resolveReference(ref, documentDir);

      // Should not return m2's own terragrunt.hcl
      if (result) {
        assert.notStrictEqual(result, path.join(documentDir, 'terragrunt.hcl'));
      }
    });
  });
});
