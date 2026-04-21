/**
 * Helpers de semana ISO 8601 em UTC.
 * Espelham a lógica de apps/api/src/lib/isoWeek.ts — mantidos separados
 * para evitar acoplamento de build entre API e Web.
 */

function mondayOfIsoWeekContainingJan4(isoYear: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4, 0, 0, 0, 0));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function mondayOfUtcCalendarDate(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const dow = utc.getUTCDay() || 7;
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() - dow + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function isoWeekNumberForUtcDate(d: Date): number {
  const isoY = d.getUTCFullYear();
  const monW1 = mondayOfIsoWeekContainingJan4(isoY);
  const monThis = mondayOfUtcCalendarDate(d);
  const diffDays = Math.round((monThis.getTime() - monW1.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function isoYearForUtcDate(d: Date): number {
  const y = d.getUTCFullYear();
  const dec31 = new Date(Date.UTC(y, 11, 31, 12, 0, 0, 0));
  const wDec31 = isoWeekNumberForUtcDate(dec31);
  if (wDec31 === 1) return y;
  const jan1 = new Date(Date.UTC(y, 0, 1, 12, 0, 0, 0));
  const wJan1 = isoWeekNumberForUtcDate(jan1);
  if (wJan1 >= 52) return y - 1;
  return y;
}

/** Retorna o ano e número de semana ISO 8601 (UTC) da semana atual. */
export function currentIsoWeek(): { year: number; week: number } {
  const now = new Date();
  const mon = mondayOfUtcCalendarDate(now);
  const year = isoYearForUtcDate(mon);
  const monW1 = mondayOfIsoWeekContainingJan4(year);
  const diffDays = Math.round((mon.getTime() - monW1.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return { year, week };
}

export function prevWeek(year: number, week: number): { year: number; week: number } {
  if (week === 1) return { year: year - 1, week: 52 };
  return { year, week: week - 1 };
}

export function nextWeek(year: number, week: number): { year: number; week: number } {
  if (week === 52) return { year: year + 1, week: 1 };
  return { year, week: week + 1 };
}
