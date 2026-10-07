import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { ZodTypeAny } from 'zod';
import * as s from './schemas';

/**
 * Entry ids are "<layer-or-locale>/<file>", e.g. "shared/experience" or
 * "es/experience", so the content layer can look them up deterministically.
 */
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.ya?ml$/, '');

const shared = (file: string, schema: ZodTypeAny) =>
  defineCollection({
    loader: glob({ pattern: `shared/${file}.yaml`, base: './src/data', generateId }),
    schema,
  });

const localized = (file: string, schema: ZodTypeAny) =>
  defineCollection({
    loader: glob({ pattern: [`*/${file}.yaml`, `!shared/${file}.yaml`], base: './src/data', generateId }),
    schema,
  });

export const collections = {
  profileShared: shared('profile', s.profileShared),
  profileText: localized('profile', s.profileText),
  siteShared: shared('site', s.siteShared),
  siteText: localized('site', s.siteText),
  experienceShared: shared('experience', s.experienceShared),
  experienceText: localized('experience', s.experienceText),
  educationShared: shared('education', s.educationShared),
  educationText: localized('education', s.educationText),
  certificationsShared: shared('certifications', s.certificationsShared),
  certificationsText: localized('certifications', s.certificationsText),
  skillsShared: shared('skills', s.skillsShared),
  skillsText: localized('skills', s.skillsText),
  projectsShared: shared('projects', s.projectsShared),
  projectsText: localized('projects', s.projectsText),
};
