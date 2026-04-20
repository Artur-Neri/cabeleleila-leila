import { describe, expect, it } from "vitest";
import {
  appointmentIntervalEnd,
  computeSlotStarts,
  intervalsOverlapHalfOpen,
  SLOT_STEP_MINUTES,
  totalDurationMinutesFromLines,
} from "./availability.js";

describe("availability", () => {
  it("intervalsOverlapHalfOpen: encostar não conflita", () => {
    const a0 = new Date("2026-04-21T09:00:00.000Z");
    const a1 = new Date("2026-04-21T10:00:00.000Z");
    const b0 = new Date("2026-04-21T10:00:00.000Z");
    const b1 = new Date("2026-04-21T11:00:00.000Z");
    expect(intervalsOverlapHalfOpen(a0, a1, b0, b1)).toBe(false);
  });

  it("intervalsOverlapHalfOpen: sobreposição real", () => {
    const a0 = new Date("2026-04-21T09:00:00.000Z");
    const a1 = new Date("2026-04-21T10:30:00.000Z");
    const b0 = new Date("2026-04-21T10:00:00.000Z");
    const b1 = new Date("2026-04-21T11:00:00.000Z");
    expect(intervalsOverlapHalfOpen(a0, a1, b0, b1)).toBe(true);
  });

  it("totalDurationMinutesFromLines", () => {
    const lines = [
      { service: { durationMinutes: 45 } },
      { service: { durationMinutes: 30 } },
    ];
    expect(totalDurationMinutesFromLines(lines)).toBe(75);
  });

  it("computeSlotStarts respeita duração e passo", () => {
    const workStart = new Date("2026-04-21T09:00:00.000Z");
    const workEnd = new Date("2026-04-21T12:00:00.000Z");
    const now = new Date("2026-04-21T08:00:00.000Z");
    const busy: { startAt: Date; endAt: Date; appointmentId: string }[] = [
      {
        startAt: new Date("2026-04-21T09:30:00.000Z"),
        endAt: new Date("2026-04-21T10:15:00.000Z"),
        appointmentId: "x",
      },
    ];
    const slots = computeSlotStarts({
      workStart,
      workEnd,
      durationMinutes: 45,
      busy,
      now,
      minLeadMs: 0,
    });
    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-04-21T10:15:00.000Z",
      "2026-04-21T10:30:00.000Z",
      "2026-04-21T10:45:00.000Z",
      "2026-04-21T11:00:00.000Z",
      "2026-04-21T11:15:00.000Z",
    ]);
    expect(SLOT_STEP_MINUTES).toBe(15);
  });

  it("appointmentIntervalEnd", () => {
    const s = new Date("2026-04-21T09:00:00.000Z");
    expect(appointmentIntervalEnd(s, 45).toISOString()).toBe("2026-04-21T09:45:00.000Z");
  });
});
