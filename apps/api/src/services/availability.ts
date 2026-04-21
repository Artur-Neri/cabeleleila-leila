import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../lib/errors.js";

/** Passo entre horários sugeridos (minutos). */
export const SLOT_STEP_MINUTES = 15;

/** Olhar agendamentos que começaram até N horas antes da janela (duração longa + segurança). */
const LOOKBACK_HOURS = 48;

type LineWithDuration = { service: { durationMinutes: number } };

export function totalDurationMinutesFromLines(lines: LineWithDuration[]): number {
  return lines.reduce((sum, line) => sum + line.service.durationMinutes, 0);
}

export function appointmentIntervalEnd(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

/** Intervalos [start, end) semiabertos: encostar fim/início não conta como conflito. */
export function intervalsOverlapHalfOpen(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type BusyInterval = { startAt: Date; endAt: Date; appointmentId: string };

export async function loadBusyIntervals(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: { windowStart: Date; windowEnd: Date; excludeAppointmentId?: string }
): Promise<BusyInterval[]> {
  const { windowStart, windowEnd, excludeAppointmentId } = params;
  const lookback = new Date(windowStart.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { not: "cancelled" },
      startAt: { lt: windowEnd, gte: lookback },
    },
    select: {
      id: true,
      startAt: true,
      lines: { select: { service: { select: { durationMinutes: true } } } },
    },
  });

  const intervals: BusyInterval[] = [];
  for (const a of appointments) {
    if (excludeAppointmentId && a.id === excludeAppointmentId) continue;
    const duration = totalDurationMinutesFromLines(a.lines);
    if (duration <= 0) continue;
    const endAt = appointmentIntervalEnd(a.startAt, duration);
    if (endAt > windowStart && a.startAt < windowEnd) {
      intervals.push({ startAt: a.startAt, endAt, appointmentId: a.id });
    }
  }
  return intervals;
}

export async function assertSlotAvailable(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    startAt: Date;
    durationMinutes: number;
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
  }
): Promise<void> {
  const exclude = new Set<string>();
  if (params.excludeAppointmentId) exclude.add(params.excludeAppointmentId);
  if (params.excludeAppointmentIds) {
    for (const id of params.excludeAppointmentIds) exclude.add(id);
  }
  const slotEnd = appointmentIntervalEnd(params.startAt, params.durationMinutes);
  const lookback = new Date(params.startAt.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { not: "cancelled" },
      startAt: { lt: slotEnd, gte: lookback },
    },
    select: {
      id: true,
      startAt: true,
      lines: { select: { service: { select: { durationMinutes: true } } } },
    },
  });
  for (const a of appointments) {
    if (exclude.has(a.id)) continue;
    const aEnd = appointmentIntervalEnd(a.startAt, totalDurationMinutesFromLines(a.lines));
    if (intervalsOverlapHalfOpen(params.startAt, slotEnd, a.startAt, aEnd)) {
      throw new AppError(
        "SLOT_TAKEN",
        "Este horário acabou de ser reservado ou já está ocupado. Escolha outro.",
        409
      );
    }
  }
}

export function slotConflictsBusy(slotStart: Date, slotEnd: Date, busy: BusyInterval[]): boolean {
  for (const b of busy) {
    if (intervalsOverlapHalfOpen(slotStart, slotEnd, b.startAt, b.endAt)) return true;
  }
  return false;
}

/**
 * Lista inícios possíveis (alinhados a SLOT_STEP_MINUTES) dentro de [workStart, workEnd - duration].
 */
export function computeSlotStarts(params: {
  workStart: Date;
  workEnd: Date;
  durationMinutes: number;
  busy: BusyInterval[];
  now: Date;
  minLeadMs: number;
}): Date[] {
  const { workStart, workEnd, durationMinutes, busy, now, minLeadMs } = params;
  const minStart = new Date(now.getTime() + minLeadMs);
  const durationMs = durationMinutes * 60_000;
  const stepMs = SLOT_STEP_MINUTES * 60_000;

  if (workEnd.getTime() - workStart.getTime() < durationMs) return [];

  const slots: Date[] = [];
  let t = workStart.getTime();
  const lastStart = workEnd.getTime() - durationMs;

  while (t <= lastStart) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + durationMs);
    if (slotStart >= minStart && !slotConflictsBusy(slotStart, slotEnd, busy)) {
      slots.push(slotStart);
    }
    t += stepMs;
  }
  return slots;
}
