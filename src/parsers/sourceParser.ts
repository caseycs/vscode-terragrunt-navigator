import { ReferenceKind, SourceReference } from '../types';
import { SOURCE_PATTERN, CONFIG_PATH_PATTERN, FIND_IN_PARENT_PATTERN } from '../constants';

const BLOCK_NAME_PATTERN = /(?:dependency|dependencies)\s+"([^"]+)"\s*\{/g;

function findBlockName(text: string, matchIndex: number): string | undefined {
  const preceding = text.substring(0, matchIndex);
  const matches = [...preceding.matchAll(new RegExp(BLOCK_NAME_PATTERN.source, 'g'))];
  if (matches.length === 0) {
    return undefined;
  }
  return matches[matches.length - 1][1];
}

function isCommentedLine(text: string, matchIndex: number): boolean {
  const lineStart = text.lastIndexOf('\n', matchIndex - 1) + 1;
  const linePrefix = text.substring(lineStart, matchIndex).trimStart();
  return linePrefix.startsWith('#') || linePrefix.startsWith('//');
}

function extractRefs(
  text: string,
  pattern: RegExp,
  kind: ReferenceKind,
): readonly SourceReference[] {
  const results: SourceReference[] = [];
  const re = new RegExp(pattern.source, pattern.flags);

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (isCommentedLine(text, match.index)) {
      continue;
    }

    const value = match[1];
    const valueStart = match.index + match[0].indexOf(value);
    const valueEnd = valueStart + value.length;

    results.push({
      kind,
      value,
      startOffset: valueStart,
      endOffset: valueEnd,
      blockName: findBlockName(text, match.index),
    });
  }

  return results;
}

export function parseSourceReferences(text: string): readonly SourceReference[] {
  const sourceRefs = extractRefs(text, SOURCE_PATTERN, 'source');
  const configPathRefs = extractRefs(text, CONFIG_PATH_PATTERN, 'config_path');
  const findInParentRefs = extractRefs(text, FIND_IN_PARENT_PATTERN, 'find_in_parent');
  return [...sourceRefs, ...configPathRefs, ...findInParentRefs];
}
