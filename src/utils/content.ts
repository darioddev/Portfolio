import { getCollection } from 'astro:content';
import { defaultLocale, type LocaleCode } from '../i18n';
import type * as S from '../schemas';

/** Reads one entry of a collection by its deterministic id, e.g. "es/profile". */
async function entry<T>(collection: string, id: string): Promise<T> {
  const entries = await getCollection(collection as 'profileShared');
  const found = entries.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Content entry "${id}" is missing from "${collection}". Run "npm run validate".`);
  return found.data as T;
}

async function items<T>(collection: string, id: string): Promise<T[]> {
  return (await entry<{ items: T[] }>(collection, id)).items;
}

/** Joins the language-neutral and translatable layers of one domain by `id`. */
function join<A extends { id: string }, B extends { id: string }>(
  domain: string,
  locale: string,
  shared: A[],
  text: B[],
): (A & B)[] {
  const byId = new Map(text.map((item) => [item.id, item]));
  return shared.map((item) => {
    const match = byId.get(item.id);
    if (!match) throw new Error(`[${domain}] locale "${locale}" has no text for id "${item.id}"`);
    return { ...item, ...match };
  });
}

const newestFirst = <T extends { start_date: string }>(list: T[]) =>
  [...list].sort((a, b) => b.start_date.localeCompare(a.start_date));

export async function getPortfolio(locale: LocaleCode) {
  const layer = <T,>(domain: string) => items<T>(`${domain}Shared`, `shared/${domain}`);
  const text = <T,>(domain: string) => items<T>(`${domain}Text`, `${locale}/${domain}`);
  const merged = async <A extends { id: string }, B extends { id: string }>(domain: string) =>
    join(domain, locale, await layer<A>(domain), await text<B>(domain));

  const [profileShared, profileText, siteShared, siteText] = await Promise.all([
    entry<S.ProfileShared>('profileShared', 'shared/profile'),
    entry<S.ProfileText>('profileText', `${locale}/profile`),
    entry<S.SiteShared>('siteShared', 'shared/site'),
    entry<S.SiteText>('siteText', `${locale}/site`),
  ]);

  const [experience, education, certifications, skills, projects] = await Promise.all([
    merged<S.ExperienceShared, S.ExperienceText>('experience'),
    merged<S.EducationShared, S.EducationText>('education'),
    merged<S.CertificationShared, S.CertificationText>('certifications'),
    merged<S.SkillShared, S.SkillText>('skills'),
    merged<S.ProjectShared, S.ProjectText>('projects'),
  ]);

  const tagLabels = new Map(profileText.tags.map((tag) => [tag.id, tag.label]));
  const cv = profileShared.cv[locale] ?? profileShared.cv[defaultLocale];

  return {
    site: { ...siteShared, ...siteText },
    // "tags" exists in both layers: keep the ids here, labels come from tagLabel().
    profile: { ...profileShared, ...profileText, tags: profileShared.tags, cv },
    tagLabel: (id: string) => tagLabels.get(id) ?? id,
    experience: newestFirst(experience),
    education: newestFirst(education),
    certifications: [...certifications].sort((a, b) => b.issue_date.localeCompare(a.issue_date)),
    skills,
    projects: [...projects].sort((a, b) => b.date.localeCompare(a.date))
  };
}

export type Portfolio = Awaited<ReturnType<typeof getPortfolio>>;
