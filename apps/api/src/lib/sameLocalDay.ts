/** Mesmo dia civil no fuso America/Sao_Paulo (adequado ao uso do salão no Brasil). */
export function sameLocalDaySaoPaulo(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}
