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

describe('DefinitionProvider Integration', () => {
  before(async () => {
    await activateExtension();
  });

  it('should provide definition for get_repo_root source path', async () => {
    const filePath = path.join(fixturesDir, 'simple', 'terragrunt.hcl');
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    // Position cursor inside the source value
    const text = document.getText();
    const sourceStart = text.indexOf('/modules/vpc');
    const position = document.positionAt(sourceStart + 5);

    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider',
      document.uri,
      position
    );

    assert.ok(definitions);
    assert.ok(definitions.length > 0, 'Should have at least one definition');
    assert.ok(
      definitions[0].uri.fsPath.endsWith('main.tf'),
      'Should point to main.tf'
    );
  });

  it('should not provide definition for remote sources', async () => {
    const content = 'source = "git::https://example.com/modules.git//vpc"';
    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'hcl',
    });

    const sourceStart = content.indexOf('git::');
    const position = document.positionAt(sourceStart + 5);

    const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeDefinitionProvider',
      document.uri,
      position
    );

    assert.ok(!definitions || definitions.length === 0);
  });
});
