import { SourceReference } from '../types';
import { HAS_INTERPOLATION } from '../constants';
import { resolveReference } from './referenceResolver';

export type ResolveFn = (ref: SourceReference, documentDir: string, renderTimeout?: number) => Promise<string | undefined>;

export function refKey(ref: SourceReference): string {
  return `${ref.startOffset}:${ref.endOffset}`;
}

function needsRender(ref: SourceReference): boolean {
  return ref.kind !== 'find_in_parent' && HAS_INTERPOLATION.test(ref.value);
}

export class BackgroundResolver {
  private readonly refs: readonly SourceReference[];
  private readonly documentDir: string;
  private readonly renderTimeout: number | undefined;
  private readonly resolveFn: ResolveFn;
  private readonly results = new Map<string, string | undefined>();
  private readonly pendingKeys: Set<string>;
  private currentKey: string | null = null;
  private currentPromise: Promise<string | undefined> | null = null;
  private cancelled = false;

  constructor(
    refs: readonly SourceReference[],
    documentDir: string,
    renderTimeout?: number,
    resolveFn: ResolveFn = resolveReference
  ) {
    // Only queue refs that require terragrunt render
    this.refs = refs.filter(needsRender);
    this.documentDir = documentDir;
    this.renderTimeout = renderTimeout;
    this.resolveFn = resolveFn;
    this.pendingKeys = new Set(this.refs.map(refKey));
  }

  cancel(): void {
    this.cancelled = true;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get queueSize(): number {
    return this.refs.length;
  }

  hasResult(key: string): boolean {
    return this.results.has(key);
  }

  getResult(key: string): string | undefined {
    return this.results.get(key);
  }

  isRenderRef(ref: SourceReference): boolean {
    return needsRender(ref);
  }

  async start(): Promise<void> {
    for (const ref of this.refs) {
      if (this.cancelled) {
        break;
      }

      const key = refKey(ref);
      if (this.results.has(key)) {
        this.pendingKeys.delete(key);
        continue;
      }

      this.currentKey = key;
      this.currentPromise = this.resolveFn(ref, this.documentDir, this.renderTimeout);

      try {
        const result = await this.currentPromise;
        this.results.set(key, result);
      } catch {
        this.results.set(key, undefined);
      }

      this.pendingKeys.delete(key);
      this.currentKey = null;
      this.currentPromise = null;
    }
  }

  async resolveNow(ref: SourceReference): Promise<string | undefined> {
    const key = refKey(ref);

    // Already resolved in background
    if (this.results.has(key)) {
      return this.results.get(key);
    }

    // Currently being resolved — wait for it
    if (this.currentKey === key && this.currentPromise) {
      try {
        return await this.currentPromise;
      } catch {
        return undefined;
      }
    }

    // Not yet processed — cancel background, resolve immediately
    this.cancel();
    try {
      const result = await this.resolveFn(ref, this.documentDir, this.renderTimeout);
      this.results.set(key, result);
      return result;
    } catch {
      this.results.set(key, undefined);
      return undefined;
    }
  }
}
