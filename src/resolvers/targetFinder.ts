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
  return undefined;
}
