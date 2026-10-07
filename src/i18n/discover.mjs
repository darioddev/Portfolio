import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import process from 'node:process';

/**
 * Lists locale codes by looking at src/i18n/locales/*.properties.
 * @param {string} [root] project root
 * @returns {string[]}
 */
export function discoverLocaleCodes(root = process.cwd()) {
  return readdirSync(join(root, 'src/i18n/locales'))
    .filter((file) => file.endsWith('.properties'))
    .map((file) => basename(file, '.properties'))
    .sort();
}
