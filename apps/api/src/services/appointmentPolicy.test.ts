import { describe, expect, it } from "vitest";
import { canCustomerReschedule } from "./appointmentPolicy.js";

describe("canCustomerReschedule", () => {
  it("permite quando faltam mais de 48h", () => {
    const now = new Date("2026-04-18T10:00:00.000Z");
    const startAt = new Date("2026-04-21T10:00:00.000Z"); // +72h
    expect(canCustomerReschedule(startAt, now)).toBe(true);
  });

  it("bloqueia quando faltam 48h ou menos", () => {
    const now = new Date("2026-04-18T10:00:00.000Z");
    const startAt = new Date("2026-04-20T10:00:00.000Z"); // exatamente +48h
    expect(canCustomerReschedule(startAt, now)).toBe(false);
  });

  it("bloqueia quando faltam menos de 48h", () => {
    const now = new Date("2026-04-18T10:00:00.000Z");
    const startAt = new Date("2026-04-19T12:00:00.000Z");
    expect(canCustomerReschedule(startAt, now)).toBe(false);
  });
});
