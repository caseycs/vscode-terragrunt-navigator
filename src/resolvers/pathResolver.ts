import * as path from 'path';
import * as fs from 'fs';
import { ResolvedPath } from '../types';
import { REMOTE_PREFIXES, GET_REPO_ROOT_PATTERN } from '../constants';

function isRemoteSource(sourceValue: string): boolean {
  return REMOTE_PREFIXES.some((prefix) => sourceValue.startsWith(prefix));
}

function hasGetRepoRoot(sourceValue: string): boolean {
  return GET_REPO_ROOT_PATTERN.test(sourceValue);
}

function stripGetRepoRoot(sourceValue: string): string {
  return sourceValue.replace(GET_REPO_ROOT_PATTERN, '');
}

export function findGitRoot(startDir: string): string | undefined {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const gitDir = path.join(current, '.git');
    try {
      fs.accessSync(gitDir);
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  return undefined;
}

export function resolveSourcePath(
  sourceValue: string,
  documentDir: string,
  repoRoot?: string
): ResolvedPath {
  if (isRemoteSource(sourceValue)) {
    return {
      absolutePath: sourceValue,
      targetFile: undefined,
      isRemote: true,
    };
  }

  if (hasGetRepoRoot(sourceValue)) {
    const remainder = stripGetRepoRoot(sourceValue);
    const effectiveRoot = repoRoot ?? findGitRoot(documentDir);

    if (!effectiveRoot) {
      return {
        absolutePath: sourceValue,
        targetFile: undefined,
        isRemote: false,
      };
    }

    const doubleSlashIndex = remainder.indexOf('//');
    let resolvedPath: string;

    if (doubleSlashIndex !== -1) {
      // Everything before // is the module path relative to repo root
      const modulePath = remainder.substring(0, doubleSlashIndex);
      const cleaned = modulePath.startsWith('/') ? modulePath.substring(1) : modulePath;
      resolvedPath = path.resolve(effectiveRoot, cleaned);
    } else {
      const cleaned = remainder.startsWith('/') ? remainder.substring(1) : remainder;
      resolvedPath = path.resolve(effectiveRoot, cleaned);
    }

    return {
      absolutePath: resolvedPath,
      targetFile: undefined,
      isRemote: false,
    };
  }

  const doubleSlashIndex = sourceValue.indexOf('//');
  let resolvedPath: string;

  if (doubleSlashIndex !== -1) {
    const prefix = sourceValue.substring(0, doubleSlashIndex);
    const suffix = sourceValue.substring(doubleSlashIndex + 2);
    resolvedPath = path.resolve(documentDir, prefix, suffix);
  } else {
    resolvedPath = path.resolve(documentDir, sourceValue);
  }

  return {
    absolutePath: resolvedPath,
    targetFile: undefined,
    isRemote: false,
  };
}

export function getRepoRoot(documentDir: string, sourceValue: string): string | undefined {
  if (hasGetRepoRoot(sourceValue)) {
    return findGitRoot(documentDir);
  }

  const doubleSlashIndex = sourceValue.indexOf('//');
  if (doubleSlashIndex === -1) {
    return undefined;
  }
  const prefix = sourceValue.substring(0, doubleSlashIndex);
  return path.resolve(documentDir, prefix);
}
