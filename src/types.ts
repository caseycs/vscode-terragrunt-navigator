export interface SourceReference {
  readonly value: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface ResolvedPath {
  readonly absolutePath: string;
  readonly targetFile: string | undefined;
  readonly isRemote: boolean;
}
