import * as vscode from 'vscode';
import { parseSourceReferences } from '../parsers/sourceParser';
import { resolveSourcePath } from '../resolvers/pathResolver';
import { findTargetFile } from '../resolvers/targetFinder';
import { SourceReference } from '../types';

interface PendingLink {
  readonly link: vscode.DocumentLink;
  readonly sourceRef: SourceReference;
  readonly documentDir: string;
}

export class TerragruntDocumentLinkProvider implements vscode.DocumentLinkProvider {
  private pendingLinks: Map<string, PendingLink> = new Map();

  provideDocumentLinks(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.DocumentLink[] {
    const text = document.getText();
    const sourceRefs = parseSourceReferences(text);
    const documentDir = getDocumentDir(document);
    const links: vscode.DocumentLink[] = [];

    this.pendingLinks.clear();

    for (const ref of sourceRefs) {
      const resolved = resolveSourcePath(ref.value, documentDir);
      if (resolved.isRemote) {
        continue;
      }

      const startPos = document.positionAt(ref.startOffset);
      const endPos = document.positionAt(ref.endOffset);
      const range = new vscode.Range(startPos, endPos);
      const link = new vscode.DocumentLink(range);
      link.tooltip = 'Follow Terragrunt source';

      const key = `${ref.startOffset}:${ref.endOffset}`;
      this.pendingLinks.set(key, { link, sourceRef: ref, documentDir });
      links.push(link);
    }

    return links;
  }

  async resolveDocumentLink(
    link: vscode.DocumentLink,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentLink | undefined> {
    for (const pending of this.pendingLinks.values()) {
      if (pending.link === link) {
        const resolved = resolveSourcePath(pending.sourceRef.value, pending.documentDir);
        const targetFile = await findTargetFile(resolved.absolutePath);
        if (targetFile) {
          link.target = vscode.Uri.file(targetFile);
          return link;
        }
        return undefined;
      }
    }
    return undefined;
  }
}

function getDocumentDir(document: vscode.TextDocument): string {
  const path = require('path');
  return path.dirname(document.uri.fsPath);
}
