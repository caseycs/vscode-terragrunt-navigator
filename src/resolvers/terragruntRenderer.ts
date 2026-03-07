import { execFile, ChildProcess } from 'child_process';
import { RenderedConfig } from '../types';

export const DEFAULT_RENDER_TIMEOUT = 10_000;

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

const activeProcesses = new Map<string, ChildProcess>();

export function renderConfig(cwd: string, timeout?: number): Promise<ParsedRenderedConfig> {
  const existing = activeProcesses.get(cwd);
  if (existing) {
    existing.kill();
    activeProcesses.delete(cwd);
  }

  const effectiveTimeout = timeout ?? DEFAULT_RENDER_TIMEOUT;

  return new Promise((resolve, reject) => {
    const child = execFile('terragrunt', ['render', '--json'], { cwd, timeout: effectiveTimeout }, (error, stdout) => {
      activeProcesses.delete(cwd);

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

    activeProcesses.set(cwd, child);
  });
}
