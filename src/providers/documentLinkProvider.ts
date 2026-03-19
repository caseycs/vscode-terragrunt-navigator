import * as vscode from 'vscode';
import * as path from 'path';
import { parseSourceReferences } from '../parsers/sourceParser';
import { resolveSourcePath } from '../resolvers/pathResolver';
import { resolveReference } from '../resolvers/referenceResolver';
import { BackgroundResolver, refKey } from '../resolvers/backgroundResolver';
import { ReferenceKind, SourceReference } from '../types';

interface PendingLink {
  readonly link: vscode.DocumentLink;
  readonly sourceRef: SourceReference;
  readonly documentDir: string;
}

export class TerragruntDocumentLinkProvider implements vscode.DocumentLinkProvider {
  private pendingLinks: Map<string, PendingLink> = new Map();
  private backgroundResolver: BackgroundResolver | null = null;

  cancelBackground(): void {
    if (this.backgroundResolver) {
      this.backgroundResolver.cancel();
      this.backgroundResolver = null;
    }
  }

  provideDocumentLinks(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.DocumentLink[] {
    this.cancelBackground();

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

      const key = refKey(ref);
      this.pendingLinks.set(key, { link, sourceRef: ref, documentDir });
      links.push(link);
    }

    const config = vscode.workspace.getConfiguration('terragruntNavigator');
    const timeout = config.get<number>('renderTimeout');
    const backgroundEnabled = config.get<boolean>('backgroundResolution', true);

    if (backgroundEnabled) {
      const resolver = new BackgroundResolver(sourceRefs, documentDir, timeout);
      this.backgroundResolver = resolver;
      resolver.start().catch(() => { /* fire-and-forget background resolution */ });
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

      const resolver = this.backgroundResolver;

      // For refs that need render — use the background resolver
      if (resolver && resolver.isRenderRef(pending.sourceRef)) {
        const targetFile = await resolver.resolveNow(pending.sourceRef);
        if (targetFile) {
          link.target = vscode.Uri.file(targetFile);
          return link;
        }
        return undefined;
      }

      // For static/find_in_parent refs — resolve on the fly
      const timeout = vscode.workspace
        .getConfiguration('terragruntNavigator')
        .get<number>('renderTimeout');
      const targetFile = await resolveReference(
        pending.sourceRef,
        pending.documentDir,
        timeout
      );
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
