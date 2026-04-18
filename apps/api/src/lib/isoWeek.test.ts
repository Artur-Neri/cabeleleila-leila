import { describe, expect, it } from "vitest";
import { boundsForIsoYearWeek, isoWeekKeyUtc, sameIsoWeekUtc } from "./isoWeek.js";

describe("isoWeekKeyUtc / sameIsoWeekUtc", () => {
  it("classifica datas na mesma semana ISO (UTC)", () => {
    const a = new Date(Date.UTC(2026, 3, 13)); // 13 Abr 2026
    const b = new Date(Date.UTC(2026, 3, 17)); // 17 Abr 2026
    expect(sameIsoWeekUtc(a, b)).toBe(true);
  });

  it("distingue semanas diferentes", () => {
    const a = new Date(Date.UTC(2026, 3, 13));
    const b = new Date(Date.UTC(2026, 3, 20));
    expect(sameIsoWeekUtc(a, b)).toBe(false);
  });

  it("produz chave estável", () => {
    const d = new Date(Date.UTC(2026, 3, 18));
    expect(isoWeekKeyUtc(d)).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("boundsForIsoYearWeek", () => {
  it("devolve intervalo contendo a semana pedida", () => {
    const { start, end } = boundsForIsoYearWeek(2026, 16);
    expect(start.getTime()).toBeLessThan(end.getTime());
    const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    expect(isoWeekKeyUtc(mid)).toBe("2026-W16");
  });
});
