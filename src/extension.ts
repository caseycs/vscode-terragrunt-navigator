import * as vscode from 'vscode';
import { TerragruntDocumentLinkProvider } from './providers/documentLinkProvider';
import { TerragruntDefinitionProvider } from './providers/definitionProvider';
import { HCL_SELECTOR } from './constants';
import { clearRenderCache } from './resolvers/renderCache';

export function activate(context: vscode.ExtensionContext): void {
  const linkProvider = new TerragruntDocumentLinkProvider();

  const linkRegistration = vscode.languages.registerDocumentLinkProvider(
    HCL_SELECTOR,
    linkProvider
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

  const editorChangeHandler = vscode.window.onDidChangeActiveTextEditor(() => {
    linkProvider.cancelBackground();
  });

  context.subscriptions.push(
    linkRegistration,
    definitionProvider,
    cacheInvalidator,
    editorChangeHandler
  );
}

export function deactivate(): void {
  clearRenderCache();
}
