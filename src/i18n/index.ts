import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLocale, localeCodes, locales, type LocaleCode } from './config';
import type { TranslationKey } from './keys';
import { parseProperties } from './properties';

export { defaultLocale, localeCodes, locales };
export type { LocaleCode, TranslationKey };

const dictionaries = Object.fromEntries(
  localeCodes.map((code) => [code, parseProperties(locales[code].properties).entries]),
) as Record<LocaleCode, Record<string, string>>;

/**
 * Looks up a UI string. Falls back to the default locale, then fails loudly:
 * a missing key is a bug that `npm run validate` also reports.
 */
export function t(
  locale: LocaleCode,
  key: TranslationKey,
  params: Record<string, string | number> = {},
): string {
  const template = dictionaries[locale][key] ?? dictionaries[defaultLocale][key];
  if (template === undefined) throw new Error(`Missing translation key "${key}"`);
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function isLocale(value: string | undefined): value is LocaleCode {
  return value !== undefined && value in locales;
}

/** Path of the home page for a locale ("/" for the default one). */
export function localeUrl(locale: LocaleCode): string {
  return getRelativeLocaleUrl(locale);
}

export function absoluteLocaleUrl(locale: LocaleCode): string {
  return getAbsoluteLocaleUrl(locale);
}
