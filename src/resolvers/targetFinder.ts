import * as fs from 'fs';
import * as path from 'path';
import { TARGET_FILES } from '../constants';

export async function findTargetFile(resolvedDir: string): Promise<string | undefined> {
  for (const targetFile of TARGET_FILES) {
    const fullPath = path.join(resolvedDir, targetFile);
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
      return fullPath;
    } catch {
      continue;
    }
  }

  // Fallback: open the first .tf file found in the directory
  try {
    const entries = await fs.promises.readdir(resolvedDir);
    const tfFile = entries.sort().find(entry => entry.endsWith('.tf'));
    if (tfFile) {
      const fullPath = path.join(resolvedDir, tfFile);
      await fs.promises.access(fullPath, fs.constants.R_OK);
      return fullPath;
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }

  return undefined;
}
