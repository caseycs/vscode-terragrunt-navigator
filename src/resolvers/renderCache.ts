import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ParsedRenderedConfig, renderConfig } from './terragruntRenderer';
import { parseSourceReferences } from '../parsers/sourceParser';
import { findInParentFolders } from './parentFinder';

interface CacheEntry {
  readonly result: ParsedRenderedConfig;
  readonly fileHashes: ReadonlyMap<string, string>;
}

const cache = new Map<string, CacheEntry>();

async function hashFile(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function collectDependentFiles(cwd: string): Promise<readonly string[]> {
  const hclPath = path.join(cwd, 'terragrunt.hcl');
  const files: string[] = [hclPath];

  try {
    const content = await fs.promises.readFile(hclPath, 'utf-8');
    const refs = parseSourceReferences(content);
    const parentRefs = refs.filter(r => r.kind === 'find_in_parent');

    const resolved = await Promise.all(
      parentRefs.map(r => findInParentFolders(r.value, cwd))
    );

    for (const filePath of resolved) {
      if (filePath) {
        files.push(filePath);
      }
    }
  } catch {
    // If we can't read the file, just use the hcl path alone
  }

  return files;
}

async function computeHashes(files: readonly string[]): Promise<ReadonlyMap<string, string>> {
  const entries = await Promise.all(
    files.map(async (f) => {
      try {
        const hash = await hashFile(f);
        return [f, hash] as const;
      } catch {
        return [f, ''] as const;
      }
    })
  );
  return new Map(entries);
}

function hashesMatch(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, value] of a) {
    if (b.get(key) !== value) {
      return false;
    }
  }
  return true;
}

export async function renderConfigCached(
  cwd: string,
  timeout?: number,
  renderFn: (cwd: string, timeout?: number) => Promise<ParsedRenderedConfig> = renderConfig
): Promise<ParsedRenderedConfig> {
  const files = await collectDependentFiles(cwd);
  const currentHashes = await computeHashes(files);

  const existing = cache.get(cwd);
  if (existing && hashesMatch(existing.fileHashes, currentHashes)) {
    return existing.result;
  }

  const result = await renderFn(cwd, timeout);
  cache.set(cwd, { result, fileHashes: currentHashes });
  return result;
}

export function clearRenderCache(): void {
  cache.clear();
}
