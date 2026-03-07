import * as vscode from 'vscode';
import * as path from 'path';
import { parseSourceReferences } from '../parsers/sourceParser';
import { resolveSourcePath } from '../resolvers/pathResolver';
import { findTargetFile } from '../resolvers/targetFinder';

export class TerragruntDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Location | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const sourceRefs = parseSourceReferences(text);

    const matchingRef = sourceRefs.find(
      (ref) => offset >= ref.startOffset && offset <= ref.endOffset
    );

    if (!matchingRef) {
      return undefined;
    }

    const documentDir = path.dirname(document.uri.fsPath);
    const resolved = resolveSourcePath(matchingRef.value, documentDir);

    if (resolved.isRemote) {
      return undefined;
    }

    const targetFile = await findTargetFile(resolved.absolutePath);
    if (!targetFile) {
      return undefined;
    }

    return new vscode.Location(
      vscode.Uri.file(targetFile),
      new vscode.Position(0, 0)
    );
  }
}
