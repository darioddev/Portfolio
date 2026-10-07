import { t, type LocaleCode } from '../i18n';

interface Period {
  start_date: string;
  end_date?: string | undefined;
  current: boolean;
}

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

function parts(iso: string) {
  const [year = 0, month = 1, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** "mar 2021" or "15 mar 2021", formatted for the active locale. */
export function formatDate(locale: LocaleCode, iso: string): string {
  const { year, month, day } = parts(iso);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    ...(day ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day ?? 1)));
}

/** Whole months covered by a period, counting both the first and the last month. */
export function monthsInPeriod(period: Period, now = new Date()): number {
  const start = parts(period.start_date);
  const end = period.end_date
    ? parts(period.end_date)
    : { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  return Math.max(1, monthIndex(end.year, end.month) - monthIndex(start.year, start.month) + 1);
}

/** "2 años y 3 meses", built with Intl so any locale works without extra keys. */
export function formatDuration(locale: LocaleCode, months: number): string {
  const unit = (value: number, name: 'year' | 'month') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'long' }).format(value);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const chunks = [years > 0 ? unit(years, 'year') : '', rest > 0 ? unit(rest, 'month') : ''].filter(Boolean);
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(chunks);
}

export function describePeriod(locale: LocaleCode, period: Period) {
  const end = period.current || !period.end_date ? t(locale, 'common.present') : formatDate(locale, period.end_date);
  return {
    range: `${formatDate(locale, period.start_date)} – ${end}`,
    duration: formatDuration(locale, monthsInPeriod(period)),
    startYear: String(parts(period.start_date).year),
  };
}
