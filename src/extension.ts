import * as vscode from 'vscode';
import { TerragruntDocumentLinkProvider } from './providers/documentLinkProvider';
import { TerragruntDefinitionProvider } from './providers/definitionProvider';
import { HCL_SELECTOR } from './constants';

export function activate(context: vscode.ExtensionContext): void {
  const linkProvider = vscode.languages.registerDocumentLinkProvider(
    HCL_SELECTOR,
    new TerragruntDocumentLinkProvider()
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    HCL_SELECTOR,
    new TerragruntDefinitionProvider()
  );

  context.subscriptions.push(linkProvider, definitionProvider);
}

export function deactivate(): void {
  // nothing to clean up
}
