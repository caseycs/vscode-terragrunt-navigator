import * as assert from 'assert';
import { parseSourceReferences } from '../../src/parsers/sourceParser';

describe('sourceParser', () => {
  describe('parseSourceReferences', () => {
    it('should parse a get_repo_root source reference', () => {
      const text = 'source = "${get_repo_root()}/modules/vpc///."';
      const refs = parseSourceReferences(text);

      assert.strictEqual(refs.length, 1);
      assert.strictEqual(refs[0].value, '${get_repo_root()}/modules/vpc///.');
    });

    it('should return correct offsets', () => {
      const text = 'source = "${get_repo_root()}/modules/vpc///."';
      const refs = parseSourceReferences(text);
      const expected = '${get_repo_root()}/modules/vpc///.'

      assert.strictEqual(refs[0].startOffset, text.indexOf(expected));
      assert.strictEqual(refs[0].endOffset, text.indexOf(expected) + expected.length);
    });

    it('should parse multiple source references', () => {
      const text = `
terraform {
  source = "\${get_repo_root()}/modules/vpc///."
}

terraform {
  source = "\${get_repo_root()}/modules/rds///."
}`;
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 2);
      assert.strictEqual(refs[0].value, '${get_repo_root()}/modules/vpc///.');
      assert.strictEqual(refs[1].value, '${get_repo_root()}/modules/rds///.');
    });

    it('should skip commented lines with #', () => {
      const text = '# source = "${get_repo_root()}/modules/vpc///."';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 0);
    });

    it('should skip commented lines with //', () => {
      const text = '// source = "${get_repo_root()}/modules/vpc///."';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 0);
    });

    it('should handle source with spaces around equals', () => {
      const text = 'source   =   "${get_repo_root()}/modules/vpc///."';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 1);
      assert.strictEqual(refs[0].value, '${get_repo_root()}/modules/vpc///.');
    });

    it('should return empty array for no matches', () => {
      const text = 'inputs = { name = "test" }';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 0);
    });

    it('should handle remote sources', () => {
      const text = 'source = "git::https://example.com/modules.git//vpc"';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 1);
      assert.strictEqual(refs[0].value, 'git::https://example.com/modules.git//vpc');
    });

    it('should parse relative source without double-slash', () => {
      const text = 'source = "../modules/vpc"';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 1);
      assert.strictEqual(refs[0].value, '../modules/vpc');
    });

    it('should not skip inline comments after source', () => {
      const text = '  source = "${get_repo_root()}/modules/vpc///." # this is a source';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 1);
    });

    it('should parse relative double-slash source', () => {
      const text = 'source = "..//modules/vpc"';
      const refs = parseSourceReferences(text);
      assert.strictEqual(refs.length, 1);
      assert.strictEqual(refs[0].value, '..//modules/vpc');
    });
  });
});
