/**
 * Locale registry. Adding a language means adding one entry here, one flag
 * component, one .properties file and one folder under src/data/.
 */
import FlagEs from './flags/FlagEs.astro';
import es from './locales/es.properties?raw';
import { defaultLocale as defaultLocaleCode } from './default-locale.mjs';

type FlagComponent = typeof FlagEs;

export interface LocaleConfig {
  code: string;
  label: string;
  flag: FlagComponent;
  properties: string;
}

export const locales = {
  es: { code: 'es', label: 'Español', flag: FlagEs, properties: es },
} satisfies Record<string, LocaleConfig>;

export type LocaleCode = keyof typeof locales;

export const localeCodes = Object.keys(locales) as LocaleCode[];

export const defaultLocale: LocaleCode = defaultLocaleCode as LocaleCode;
