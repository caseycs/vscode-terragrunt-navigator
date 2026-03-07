import * as vscode from 'vscode';
import { TerragruntDocumentLinkProvider } from './providers/documentLinkProvider';
import { TerragruntDefinitionProvider } from './providers/definitionProvider';
import { HCL_SELECTOR } from './constants';
import { clearRenderCache } from './resolvers/renderCache';

export function activate(context: vscode.ExtensionContext): void {
  const linkProvider = vscode.languages.registerDocumentLinkProvider(
    HCL_SELECTOR,
    new TerragruntDocumentLinkProvider()
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    HCL_SELECTOR,
    new TerragruntDefinitionProvider()
  );

  const cacheInvalidator = vscode.workspace.onDidSaveTextDocument((doc) => {
    if (doc.fileName.endsWith('.hcl')) {
      clearRenderCache();
    }
  });

  context.subscriptions.push(linkProvider, definitionProvider, cacheInvalidator);
}

export function deactivate(): void {
  clearRenderCache();
}
