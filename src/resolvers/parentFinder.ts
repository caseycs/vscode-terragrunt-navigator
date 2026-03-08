import * as path from 'path';
import * as fs from 'fs';

export async function findInParentFolders(filename: string, startDir: string): Promise<string | undefined> {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const candidate = path.join(current, filename);
    try {
      await fs.promises.access(candidate, fs.constants.R_OK);
      return candidate;
    } catch {
      current = path.dirname(current);
    }
  }
  return undefined;
}
