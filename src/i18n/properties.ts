export interface ParsedProperties {
  entries: Record<string, string>;
  duplicates: string[];
  empty: string[];
  malformed: { line: number; text: string }[];
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;

/**
 * Parses a minimal .properties file: `dot.separated.key=value`, `#` comments,
 * blank lines ignored. Only the first "=" splits key from value, and values are
 * taken as UTF-8 text without escape processing.
 */
export function parseProperties(source: string): ParsedProperties {
  const result: ParsedProperties = { entries: {}, duplicates: [], empty: [], malformed: [] };

  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;

    const separator = line.indexOf('=');
    const key = separator === -1 ? '' : line.slice(0, separator).trim();
    if (!KEY_PATTERN.test(key)) {
      result.malformed.push({ line: index + 1, text: raw });
      return;
    }

    const value = line.slice(separator + 1).trim();
    if (key in result.entries) result.duplicates.push(key);
    if (value === '') result.empty.push(key);
    result.entries[key] = value;
  });

  return result;
}

/** Names of the `{placeholders}` used in a translated string. */
export function placeholdersOf(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((match) => match[1] as string).sort();
}
