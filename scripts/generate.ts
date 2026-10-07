/**
 * Regenerates files derived from source-of-truth inputs:
 *  - src/i18n/keys.ts          typed translation keys from the default locale
 *  - schemas/*.schema.json     editor schemas from the Zod schemas
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { defaultLocale } from '../src/i18n/default-locale.mjs';
import { parseProperties } from '../src/i18n/properties';
import { registry } from '../src/schemas';
import { toJsonSchema } from './lib/json-schema';

const root = process.cwd();

function writeIfChanged(file: string, content: string) {
  let previous = '';
  try {
    previous = readFileSync(file, 'utf8');
  } catch {
    // first run
  }
  if (previous !== content) writeFileSync(file, content);
}

// Translation keys
const source = readFileSync(join(root, `src/i18n/locales/${defaultLocale}.properties`), 'utf8');
const keys = Object.keys(parseProperties(source).entries);
writeIfChanged(
  join(root, 'src/i18n/keys.ts'),
  [
    `// Derived from src/i18n/locales/${defaultLocale}.properties by "npm run generate".`,
    '// Do not edit by hand.',
    `export const translationKeys = [`,
    ...keys.map((key) => `  '${key}',`),
    `] as const;`,
    '',
    'export type TranslationKey = (typeof translationKeys)[number];',
    '',
  ].join('\n'),
);

// JSON Schemas
mkdirSync(join(root, 'schemas'), { recursive: true });
for (const [domain, layers] of Object.entries(registry)) {
  for (const layer of ['shared', 'text'] as const) {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: `${domain} (${layer})`,
      ...toJsonSchema(layers[layer]),
    };
    writeIfChanged(join(root, `schemas/${domain}.${layer}.schema.json`), JSON.stringify(schema, null, 2) + '\n');
  }
}
console.log(`generate: ${keys.length} translation keys, ${Object.keys(registry).length * 2} JSON schemas`);
