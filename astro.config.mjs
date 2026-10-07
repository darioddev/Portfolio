import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { load } from 'js-yaml';
import { defaultLocale } from './src/i18n/default-locale.mjs';
import { discoverLocaleCodes } from './src/i18n/discover.mjs';

// The canonical site URL is defined once, in src/data/shared/site.yaml.
const site = load(readFileSync('./src/data/shared/site.yaml', 'utf8')).seo.site_url;
const basePath = load(readFileSync('./src/data/shared/site.yaml', 'utf8')).seo.base_path;

// Locales are discovered from src/i18n/locales/*.properties, so adding a
// language never requires touching this file.
const localeCodes = discoverLocaleCodes();

export default defineConfig({
  site,
  base: basePath,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  i18n: {
    defaultLocale,
    locales: localeCodes,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(localeCodes.map((code) => [code, code])),
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
