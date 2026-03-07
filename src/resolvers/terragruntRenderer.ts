import { execFile } from 'child_process';
import { RenderedConfig } from '../types';

export interface ParsedRenderedConfig {
  readonly source: string | undefined;
  readonly dependencies: ReadonlyMap<string, string>;
}

export function parseRenderedConfig(json: string): ParsedRenderedConfig {
  const config: RenderedConfig = JSON.parse(json);

  const source = config.terraform?.source ?? undefined;

  const dependencies = new Map<string, string>();
  if (config.dependency) {
    for (const [name, dep] of Object.entries(config.dependency)) {
      if (dep.config_path) {
        dependencies.set(name, dep.config_path);
      }
    }
  }

  return { source, dependencies };
}

export function renderConfig(cwd: string): Promise<ParsedRenderedConfig> {
  return new Promise((resolve, reject) => {
    execFile('terragrunt', ['render', '--json'], { cwd, timeout: 30_000 }, (error, stdout) => {
      if (error) {
        reject(new Error(`terragrunt render failed: ${error.message}`));
        return;
      }

      const lastLine = stdout.trim().split('\n').pop();
      if (!lastLine) {
        reject(new Error('terragrunt render returned empty output'));
        return;
      }

      try {
        resolve(parseRenderedConfig(lastLine));
      } catch (parseError) {
        reject(new Error(`Failed to parse terragrunt render output: ${(parseError as Error).message}`));
      }
    });
  });
}
