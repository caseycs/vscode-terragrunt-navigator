import * as path from 'path';
import * as fs from 'fs';
import { SourceReference } from '../types';
import { HAS_INTERPOLATION } from '../constants';
import { resolveSourcePath } from './pathResolver';
import { findTargetFile } from './targetFinder';
import { findInParentFolders } from './parentFinder';
import { renderConfigCached } from './renderCache';

export async function resolveReference(ref: SourceReference, documentDir: string, renderTimeout?: number): Promise<string | undefined> {
  if (ref.kind === 'find_in_parent') {
    return findInParentFolders(ref.value, documentDir);
  }

  if (HAS_INTERPOLATION.test(ref.value)) {
    return resolveViaRender(ref, documentDir, renderTimeout);
  }

  return resolveStatically(ref, documentDir);
}

async function resolveStatically(ref: SourceReference, documentDir: string): Promise<string | undefined> {
  const resolved = resolveSourcePath(ref.value, documentDir);

  if (resolved.isRemote) {
    return undefined;
  }

  return findTarget(ref.kind, resolved.absolutePath);
}

async function resolveViaRender(ref: SourceReference, documentDir: string, timeout?: number): Promise<string | undefined> {
  try {
    const rendered = await renderConfigCached(documentDir, timeout);

    if (ref.kind === 'config_path' && ref.blockName) {
      const configPath = rendered.dependencies.get(ref.blockName);
      if (configPath) {
        return findTarget('config_path', configPath);
      }
    }

    if (ref.kind === 'source' && rendered.source) {
      const resolved = resolveSourcePath(rendered.source, documentDir);
      return findTarget('source', resolved.absolutePath);
    }
  } catch {
    return resolveStatically(ref, documentDir);
  }

  return undefined;
}

function findTarget(kind: string, absolutePath: string): Promise<string | undefined> {
  if (kind === 'config_path') {
    return findTerragruntHcl(absolutePath);
  }

  return findTargetFile(absolutePath);
}

async function findTerragruntHcl(dir: string): Promise<string | undefined> {
  const hclPath = path.join(dir, 'terragrunt.hcl');
  try {
    await fs.promises.access(hclPath, fs.constants.R_OK);
    return hclPath;
  } catch {
    return undefined;
  }
}
