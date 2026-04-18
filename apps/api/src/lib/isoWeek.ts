/**
 * Semana ISO em UTC (sem depender do fuso da máquina).
 * Referência: algoritmo “segunda-feira da semana ISO” via 4 de janeiro.
 */

function mondayOfIsoWeekContainingJan4(isoYear: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4, 0, 0, 0, 0));
  const dow = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
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

function isoWeekNumberForUtcDate(d: Date): number {
  const isoY = d.getUTCFullYear();
  const monW1 = mondayOfIsoWeekContainingJan4(isoY);
  const monThis = mondayOfUtcCalendarDate(d);
  const diffDays = Math.round((monThis.getTime() - monW1.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function mondayOfUtcCalendarDate(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const dow = utc.getUTCDay() || 7;
  const monday = new Date(utc);
  monday.setUTCDate(utc.getUTCDate() - dow + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function isoWeekKeyUtc(d: Date): string {
  const mon = mondayOfUtcCalendarDate(d);
  const isoY = isoYearForUtcDate(mon);
  const monW1 = mondayOfIsoWeekContainingJan4(isoY);
  const diffDays = Math.round((mon.getTime() - monW1.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return `${isoY}-W${String(week).padStart(2, "0")}`;
}

export function sameIsoWeekUtc(a: Date, b: Date): boolean {
  return isoWeekKeyUtc(a) === isoWeekKeyUtc(b);
}

export function boundsForIsoYearWeek(isoYear: number, isoWeek: number): { start: Date; end: Date } {
  const monW1 = mondayOfIsoWeekContainingJan4(isoYear);
  const start = new Date(monW1);
  start.setUTCDate(monW1.getUTCDate() + (isoWeek - 1) * 7);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}
