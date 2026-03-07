import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures');

async function activateExtension(): Promise<void> {
  const ext = vscode.extensions.getExtension('caseycs.vscode-terragrunt-navigator');
  if (ext && !ext.isActive) {
    await ext.activate();
  }
}

describe('DocumentLinkProvider Integration', () => {
  before(async () => {
    await activateExtension();
  });

  it('should provide document links for source references', async () => {
    const filePath = path.join(fixturesDir, 'simple', 'terragrunt.hcl');
    const document = await vscode.workspace.openTextDocument(filePath);
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      'vscode.executeLinkProvider',
      document.uri
    );

    assert.ok(links);
    assert.ok(links.length > 0, 'Should have at least one link');
  });

  it('should not provide links for commented source references', async () => {
    const filePath = path.join(fixturesDir, 'nested', 'env', 'terragrunt.hcl');
    const document = await vscode.workspace.openTextDocument(filePath);
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      'vscode.executeLinkProvider',
      document.uri
    );

    assert.ok(links);
    // Only the uncommented source should produce a link
    assert.strictEqual(links.length, 1);
  });
});
