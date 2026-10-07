/**
 * Validates every content and translation file, then cross-checks them.
 * Exits with code 1 and a readable report when anything is wrong.
 *
 * Checks:
 *  - YAML syntax and structure (Zod, same schemas as the Astro build)
 *  - one text layer per locale, covering exactly the ids of the shared layer
 *  - tag references, diagram alt text, section keys
 *  - referenced images, CV and diagram files exist
 *  - .properties files: same keys as the default locale, no empty or duplicate keys,
 *    same {placeholders}
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { load, YAMLException } from 'js-yaml';
import type { ZodTypeAny } from 'zod';
import { defaultLocale } from '../src/i18n/default-locale.mjs';
import { discoverLocaleCodes } from '../src/i18n/discover.mjs';
import { parseProperties, placeholdersOf } from '../src/i18n/properties';
import { registry, sectionIds, type Domain } from '../src/schemas';

const root = process.cwd();
const errors: string[] = [];
const fail = (where: string, message: string) => errors.push(`  ${where}: ${message}`);
const rel = (path: string) => path.replace(root + '/', '');

/* helpers --------------------------------------------------------------- */

function readYaml(path: string): unknown {
  try {
    return load(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error instanceof YAMLException) {
      const line = error.mark ? ` (line ${error.mark.line + 1})` : '';
      fail(rel(path), `YAML syntax error${line}: ${error.reason}`);
    } else {
      fail(rel(path), `cannot read file: ${String(error)}`);
    }
    return undefined;
  }
}

function parseWith(path: string, schema: ZodTypeAny): unknown {
  if (!existsSync(path)) {
    fail(rel(path), 'file is missing');
    return undefined;
  }
  const data = readYaml(path);
  if (data === undefined) return undefined;
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(rel(path), `${issue.path.join('.') || '(root)'} - ${issue.message}`);
    }
    return undefined;
  }
  return result.data;
}

const idsOf = (data: unknown): string[] =>
  ((data as { items?: { id: string }[] } | undefined)?.items ?? []).map((item) => item.id);

const imageExists = (path: string) => existsSync(join(root, 'src/assets', path));
const publicExists = (path: string) => existsSync(join(root, 'public', path));

/* locales --------------------------------------------------------------- */

const dataLocales = readdirSync(join(root, 'src/data'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)
  .sort();
const propertyLocales = discoverLocaleCodes(root);

if (!dataLocales.includes(defaultLocale)) fail('src/data', `missing folder for default locale "${defaultLocale}"`);
if (!propertyLocales.includes(defaultLocale)) fail('src/i18n/locales', `missing ${defaultLocale}.properties`);
for (const code of dataLocales) {
  if (!propertyLocales.includes(code)) fail(`src/data/${code}`, `no matching src/i18n/locales/${code}.properties`);
}
for (const code of propertyLocales) {
  if (!dataLocales.includes(code)) fail(`src/i18n/locales/${code}.properties`, `no matching src/data/${code}/ folder`);
}

const configSource = readFileSync(join(root, 'src/i18n/config.ts'), 'utf8');
const registered = [...configSource.matchAll(/\bcode:\s*'([a-zA-Z-]+)'/g)].map((match) => match[1]);
for (const code of propertyLocales) {
  if (!registered.includes(code)) fail('src/i18n/config.ts', `locale "${code}" is not registered`);
}

/* translations ---------------------------------------------------------- */

const parsed = new Map<string, ReturnType<typeof parseProperties>>();
for (const code of propertyLocales) {
  const file = `src/i18n/locales/${code}.properties`;
  const result = parseProperties(readFileSync(join(root, file), 'utf8'));
  parsed.set(code, result);
  result.malformed.forEach((item) => fail(file, `line ${item.line} is not a valid "key=value" entry: ${item.text.trim()}`));
  result.duplicates.forEach((key) => fail(file, `duplicate key "${key}"`));
  result.empty.forEach((key) => fail(file, `empty value for "${key}"`));
}

const reference = parsed.get(defaultLocale);
if (reference) {
  const referenceKeys = Object.keys(reference.entries);
  for (const [code, result] of parsed) {
    if (code === defaultLocale) continue;
    const file = `src/i18n/locales/${code}.properties`;
    const keys = new Set(Object.keys(result.entries));
    referenceKeys.filter((key) => !keys.has(key)).forEach((key) => fail(file, `missing key "${key}"`));
    [...keys].filter((key) => !(key in reference.entries)).forEach((key) => fail(file, `extra key "${key}"`));
    for (const key of referenceKeys) {
      const value = result.entries[key];
      if (value === undefined) continue;
      const expected = placeholdersOf(reference.entries[key] as string).join(',');
      if (placeholdersOf(value).join(',') !== expected) {
        fail(file, `"${key}" must use the placeholders {${expected.split(',').join('}, {')}}`);
      }
    }
  }
  for (const id of sectionIds) {
    for (const key of [`nav.${id}`, `section.${id}.title`, ...(id === 'about' ? [] : [`section.${id}.intro`])]) {
      if (!(key in reference.entries)) fail(`src/i18n/locales/${defaultLocale}.properties`, `missing key "${key}" for section "${id}"`);
    }
  }
}

/* content layers -------------------------------------------------------- */

type Loaded = Partial<Record<Domain, { shared: any; text: Record<string, any> }>>; // eslint-disable-line @typescript-eslint/no-explicit-any
const content: Loaded = {};

for (const [domain, layers] of Object.entries(registry) as [Domain, (typeof registry)[Domain]][]) {
  const shared = parseWith(join(root, `src/data/shared/${domain}.yaml`), layers.shared);
  const text: Record<string, unknown> = {};
  for (const code of dataLocales) {
    text[code] = parseWith(join(root, `src/data/${code}/${domain}.yaml`), layers.text);
  }
  content[domain] = { shared, text };

  if (!layers.list || !shared) continue;
  const sharedIds = idsOf(shared);
  for (const code of dataLocales) {
    if (!text[code]) continue;
    const localeIds = idsOf(text[code]);
    sharedIds
      .filter((id) => !localeIds.includes(id))
      .forEach((id) => fail(`src/data/${code}/${domain}.yaml`, `missing text for id "${id}"`));
    localeIds
      .filter((id) => !sharedIds.includes(id))
      .forEach((id) => fail(`src/data/${code}/${domain}.yaml`, `id "${id}" does not exist in shared/${domain}.yaml`));
  }
}

/* cross-checks ---------------------------------------------------------- */

const profile = content.profile;
if (profile?.shared) {
  const { photo, cv, tags } = profile.shared as { photo: string; cv: Record<string, string>; tags: string[] };
  if (!imageExists(photo)) fail('src/data/shared/profile.yaml', `photo not found: src/assets/${photo}`);
  if (!(defaultLocale in cv)) fail('src/data/shared/profile.yaml', `cv needs an entry for the default locale "${defaultLocale}"`);
  for (const [code, path] of Object.entries(cv)) {
    if (!publicExists(path)) fail('src/data/shared/profile.yaml', `cv.${code} file not found: public${path}`);
    if (!propertyLocales.includes(code)) fail('src/data/shared/profile.yaml', `cv.${code} refers to an unknown locale`);
  }
  for (const code of dataLocales) {
    const labels = ((profile.text[code] as { tags?: { id: string }[] } | undefined)?.tags ?? []).map((tag) => tag.id);
    tags.filter((tag) => !labels.includes(tag)).forEach((tag) => fail(`src/data/${code}/profile.yaml`, `no label for tag "${tag}"`));
  }
}

const knownTags = new Set((profile?.shared as { tags?: string[] } | undefined)?.tags ?? []);
const checkTags = (file: string, items: { id: string; tags: string[] }[] = []) =>
  items.forEach((item) =>
    item.tags.filter((tag) => !knownTags.has(tag)).forEach((tag) => fail(file, `"${item.id}" uses unknown tag "${tag}" (declare it in profile.yaml tags)`)),
  );

const items = <T>(domain: Domain): T[] => (content[domain]?.shared as { items?: T[] } | undefined)?.items ?? [];

checkTags('src/data/shared/experience.yaml', items('experience'));
checkTags('src/data/shared/projects.yaml', items('projects'));
checkTags('src/data/shared/notes.yaml', items('notes'));

const logoOwners: [string, { id: string; logo?: string; photo?: string }[]][] = [
  ['experience', items('experience')],
  ['education', items('education')],
  ['certifications', items('certifications')],
  ['testimonials', items('testimonials')],
];
for (const [domain, entries] of logoOwners) {
  for (const entry of entries) {
    const image = entry.logo ?? entry.photo;
    if (image && !imageExists(image)) fail(`src/data/shared/${domain}.yaml`, `"${entry.id}" image not found: src/assets/${image}`);
  }
}

for (const project of items<{ id: string; diagram?: string }>('projects')) {
  if (!project.diagram) continue;
  if (!publicExists(project.diagram)) fail('src/data/shared/projects.yaml', `"${project.id}" diagram not found: public${project.diagram}`);
  for (const code of dataLocales) {
    const localized = content.projects?.text[code] as { items: { id: string; diagram_alt?: string }[] } | undefined;
    const entry = localized?.items.find((item) => item.id === project.id);
    if (entry && !entry.diagram_alt) fail(`src/data/${code}/projects.yaml`, `"${project.id}" has a diagram and needs diagram_alt`);
  }
}

const site = content.site?.shared as { seo: { og_image: string } } | undefined;
if (site && !publicExists(site.seo.og_image)) fail('src/data/shared/site.yaml', `og_image not found: public${site.seo.og_image}`);

/* report ---------------------------------------------------------------- */

if (errors.length > 0) {
  console.error(`\nValidation failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`);
  console.error(errors.join('\n'));
  console.error('');
  process.exit(1);
}
console.log(`validate: ok (${dataLocales.length} locale${dataLocales.length === 1 ? '' : 's'}: ${dataLocales.join(', ')})`);
