/**
 * Zod schemas for every YAML file. Each domain has two layers:
 *  - shared: language-neutral facts (ids, dates, urls, paths)
 *  - text:   translatable copy, one file per locale
 * Entries of both layers are joined by their stable `id`.
 *
 * Imported by src/content.config.ts (build) and scripts/ (validation, JSON Schema).
 */
import { z } from 'zod';

export const sectionIds = [
  'about',
  'experience',
  'education',
  'certifications',
  'skills',
  'projects',
  'architecture',
  'contact',
] as const;
export type SectionId = (typeof sectionIds)[number];

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase kebab-case, e.g. "my-entry"');
// YAML parses unquoted full dates (2024-03-15) into Date objects; turn them back into strings.
const isoDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/, 'Use YYYY-MM or YYYY-MM-DD'),
);
const url = z.string().url();
/** Image inside src/assets/, e.g. "images/logos/acme.svg". Optimized by astro:assets. */
const imagePath = z.string().regex(/^images\/.+\.(jpe?g|png|webp|avif|svg)$/i, 'Use a path like "images/..."');
/** File inside public/, served as-is, e.g. "/cv/cv-es.pdf". */
const publicPath = z.string().regex(/^\/[^\s]+$/, 'Use a path starting with "/"');

const monthOf = (date: string) => date.slice(0, 7);

interface Period {
  start_date: string;
  end_date?: string | undefined;
  current: boolean;
}

function checkPeriod(value: Period, ctx: z.RefinementCtx) {
  if (value.current && value.end_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'Remove end_date when current is true' });
  }
  if (!value.current && !value.end_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'Set end_date, or use current: true' });
  }
  if (value.end_date && monthOf(value.start_date) > monthOf(value.end_date)) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'end_date is before start_date' });
  }
}

/** A list of entries identified by `id`, with unique ids. */
function list<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({ items: z.array(item) })
    .strict()
    .superRefine((value, ctx) => {
      const seen = new Set<string>();
      (value.items as { id: string }[]).forEach((entry, index) => {
        if (seen.has(entry.id)) {
          ctx.addIssue({ code: 'custom', path: ['items', index, 'id'], message: `Duplicate id "${entry.id}"` });
        }
        seen.add(entry.id);
      });
    });
}

/* profile --------------------------------------------------------------- */

export const profileShared = z
  .object({
    first_name: text,
    last_name: text,
    email: z.string().email(),
    photo: imagePath,
    /** One CV per locale; locales without an entry fall back to the default locale. */
    cv: z.record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), publicPath),
    availability: z.enum(['open', 'limited', 'closed']),
    tags: z.array(id).min(1),
    links: z.array(
      z
        .object({
          id,
          kind: z.enum(['github', 'linkedin', 'azure', 'x', 'website', 'other']),
          label: text,
          url,
        })
        .strict(),
    ),
  })
  .strict();

export const profileText = z
  .object({
    headline: text,
    summary: text,
    bio: z.array(text).min(1),
    location: text,
    photo_alt: text,
    availability_text: text.optional().nullable().default(null),
    cta_label: text,
    tags: z.array(z.object({ id, label: text }).strict()).min(1),
  })
  .strict();

/* site ------------------------------------------------------------------ */

export const siteShared = z
  .object({
    theme: z.object({ default: z.enum(['system', 'light', 'dark']) }).strict(),
    seo: z
      .object({
        site_url: url,
        base_path: z.string().regex(/^\/[^\s]*$/, 'Use a path starting with "/"'),
        og_image: publicPath.optional().nullable(),
        twitter_handle: z.string().regex(/^@\w+$/).optional(),
      })
      .strict(),
    /** Order and visibility of page sections. The first enabled section must be "about". */
    sections: z
      .array(z.object({ id: z.enum(sectionIds), enabled: z.boolean() }).strict())
      .min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.sections.map((section) => section.id);
    ids.forEach((sectionId, index) => {
      if (ids.indexOf(sectionId) !== index) {
        ctx.addIssue({ code: 'custom', path: ['sections', index, 'id'], message: `Duplicate section "${sectionId}"` });
      }
    });
    if (value.sections.find((section) => section.enabled)?.id !== 'about') {
      ctx.addIssue({ code: 'custom', path: ['sections'], message: 'The first enabled section must be "about"' });
    }
  });

export const siteText = z
  .object({ title: text, description: text, og_image_alt: text })
  .strict();

/* experience ------------------------------------------------------------ */

export const employmentTypes = ['full_time', 'part_time', 'contract', 'freelance', 'internship'] as const;

const experienceSharedItem = z
  .object({
    id,
    company: text,
    company_url: url,
    logo: imagePath,
    employment_type: z.enum(employmentTypes),
    start_date: isoDate,
    end_date: isoDate.optional(),
    current: z.boolean().default(false),
    tech_stack: z.array(text).min(1),
    tags: z.array(id),
  })
  .strict()
  .superRefine(checkPeriod);

const experienceTextItem = z
  .object({
    id,
    position: text,
    location: text,
    summary: text,
    responsibilities: z.array(text).min(1),
    achievements: z.array(text),
  })
  .strict();

export const experienceShared = list(experienceSharedItem);
export const experienceText = list(experienceTextItem);

/* education ------------------------------------------------------------- */

const educationSharedItem = z
  .object({
    id,
    institution: text,
    logo: imagePath,
    start_date: isoDate,
    end_date: isoDate.optional(),
    current: z.boolean().default(false),
  })
  .strict()
  .superRefine(checkPeriod);

const educationTextItem = z
  .object({ id, degree: text, field: text, location: text, description: text, highlights: z.array(text) })
  .strict();

export const educationShared = list(educationSharedItem);
export const educationText = list(educationTextItem);

/* certifications -------------------------------------------------------- */

export const certificationLevels = ['fundamentals', 'associate', 'professional', 'expert', 'specialty'] as const;

const certificationSharedItem = z
  .object({
    id,
    name: text,
    issuer: text,
    logo: imagePath,
    issue_date: isoDate,
    expiry_date: isoDate.optional(),
    credential_id: text,
    credential_url: url.optional(),
    skills: z.array(text),
    level: z.enum(certificationLevels).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.expiry_date && monthOf(value.issue_date) > monthOf(value.expiry_date)) {
      ctx.addIssue({ code: 'custom', path: ['expiry_date'], message: 'expiry_date is before issue_date' });
    }
  });

export const certificationsShared = list(certificationSharedItem);
export const certificationsText = list(z.object({ id, description: text }).strict());

/* skills ---------------------------------------------------------------- */

export const skillsShared = list(z.object({ id, skills: z.array(text).min(1) }).strict());
export const skillsText = list(z.object({ id, title: text }).strict());

/* projects (kind "project" or "architecture") --------------------------- */

export const projectKinds = ['project', 'architecture'] as const;

export const projectsShared = list(
  z
    .object({
      id,
      kind: z.enum(projectKinds),
      date: isoDate,
      url: url.optional(),
      repo_url: url.optional(),
      diagram: publicPath.optional(),
      tech: z.array(text),
      tags: z.array(id),
    })
    .strict(),
);
export const projectsText = list(
  z
    .object({
      id,
      title: text,
      summary: text,
      highlights: z.array(text),
      diagram_alt: text.optional(),
    })
    .strict(),
);



/* registry -------------------------------------------------------------- */

/** Every domain, used by validation and JSON Schema generation. `list` domains carry an items array. */
export const registry = {
  profile: { shared: profileShared, text: profileText, list: false },
  site: { shared: siteShared, text: siteText, list: false },
  experience: { shared: experienceShared, text: experienceText, list: true },
  education: { shared: educationShared, text: educationText, list: true },
  certifications: { shared: certificationsShared, text: certificationsText, list: true },
  skills: { shared: skillsShared, text: skillsText, list: true },
  projects: { shared: projectsShared, text: projectsText, list: true },
} as const;

export type Domain = keyof typeof registry;

type Item<S extends z.ZodTypeAny> = z.infer<S> extends { items: (infer I)[] } ? I : never;
export type ExperienceShared = Item<typeof experienceShared>;
export type ExperienceText = Item<typeof experienceText>;
export type EducationShared = Item<typeof educationShared>;
export type EducationText = Item<typeof educationText>;
export type CertificationShared = Item<typeof certificationsShared>;
export type CertificationText = Item<typeof certificationsText>;
export type SkillShared = Item<typeof skillsShared>;
export type SkillText = Item<typeof skillsText>;
export type ProjectShared = Item<typeof projectsShared>;
export type ProjectText = Item<typeof projectsText>;
export type ProfileShared = z.infer<typeof profileShared>;
export type ProfileText = z.infer<typeof profileText>;
export type SiteShared = z.infer<typeof siteShared>;
export type SiteText = z.infer<typeof siteText>;
