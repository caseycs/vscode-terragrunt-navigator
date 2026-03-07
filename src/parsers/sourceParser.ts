import { SourceReference } from '../types';
import { SOURCE_PATTERN } from '../constants';

function isCommentedLine(text: string, matchIndex: number): boolean {
  const lineStart = text.lastIndexOf('\n', matchIndex - 1) + 1;
  const linePrefix = text.substring(lineStart, matchIndex).trimStart();
  return linePrefix.startsWith('#') || linePrefix.startsWith('//');
}

export function parseSourceReferences(text: string): readonly SourceReference[] {
  const results: SourceReference[] = [];
  const pattern = new RegExp(SOURCE_PATTERN.source, SOURCE_PATTERN.flags);

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (isCommentedLine(text, match.index)) {
      continue;
    }

    const value = match[1];
    const valueStart = match.index + match[0].indexOf(value);
    const valueEnd = valueStart + value.length;

    results.push({
      value,
      startOffset: valueStart,
      endOffset: valueEnd,
    });
  }

  return results;
}
