export type ReferenceKind = 'source' | 'config_path';

export interface SourceReference {
  readonly kind: ReferenceKind;
  readonly value: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly blockName?: string;
}

export interface ResolvedPath {
  readonly absolutePath: string;
  readonly targetFile: string | undefined;
  readonly isRemote: boolean;
}

export interface RenderedConfig {
  readonly terraform?: {
    readonly source?: string;
  };
  readonly dependency?: Record<string, {
    readonly config_path?: string;
  }>;
}
