import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,avif,svg}',
  { eager: true },
);

/** Resolves a YAML image path such as "images/logos/acme.svg" to optimizable metadata. */
export function resolveImage(path: string): ImageMetadata {
  const module = images[`/src/assets/${path}`];
  if (!module) throw new Error(`Image not found: src/assets/${path}`);
  return module.default;
}
