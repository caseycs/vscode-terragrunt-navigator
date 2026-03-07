import * as vscode from 'vscode';
import * as path from 'path';
import { parseSourceReferences } from '../parsers/sourceParser';
import { resolveSourcePath } from '../resolvers/pathResolver';
import { resolveReference } from '../resolvers/referenceResolver';
import { ReferenceKind, SourceReference } from '../types';

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
    const documentDir = path.dirname(document.uri.fsPath);
    const links: vscode.DocumentLink[] = [];

    this.pendingLinks.clear();

    for (const ref of sourceRefs) {
      if (ref.kind !== 'find_in_parent') {
        const resolved = resolveSourcePath(ref.value, documentDir);
        if (resolved.isRemote) {
          continue;
        }
      }

      const startPos = document.positionAt(ref.startOffset);
      const endPos = document.positionAt(ref.endOffset);
      const range = new vscode.Range(startPos, endPos);
      const link = new vscode.DocumentLink(range);
      link.tooltip = tooltipForKind(ref.kind);

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
      if (pending.link !== link) {
        continue;
      }

      const targetFile = await resolveReference(pending.sourceRef, pending.documentDir);
      if (targetFile) {
        link.target = vscode.Uri.file(targetFile);
        return link;
      }
      return undefined;
    }
    return undefined;
  }
}

function tooltipForKind(kind: ReferenceKind): string {
  switch (kind) {
    case 'config_path': return 'Follow Terragrunt dependency';
    case 'find_in_parent': return 'Open parent config';
    case 'source': return 'Follow Terragrunt source';
  }
}
