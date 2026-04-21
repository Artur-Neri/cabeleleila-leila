import { sameLocalDaySaoPaulo } from "../lib/sameLocalDay.js";

export type AppointmentLineRef = { serviceId: string };

export type ConflictingAppointment = {
  id: string;
  startAt: Date;
  lines: AppointmentLineRef[];
};

export type SameDayOverlapPlan =
  | { kind: "none" }
  | {
      kind: "merge_into_existing";
      targetId: string;
      cancelIds: string[];
      unionServiceIds: string[];
      anchorStartAt: Date;
    }
  | {
      kind: "create_new";
      cancelIds: string[];
      unionServiceIds: string[];
      anchorStartAt: Date;
    };

export function filterSameDayServiceOverlap(
  proposed: Date,
  proposedServiceIds: string[],
  appointments: ConflictingAppointment[]
): ConflictingAppointment[] {
  const selected = new Set(proposedServiceIds);
  return appointments.filter(
    (a) =>
      sameLocalDaySaoPaulo(a.startAt, proposed) && a.lines.some((l) => selected.has(l.serviceId))
  );
}

/**
 * Se há sobreposição de serviço no mesmo dia: unir tudo no horário mais cedo e cancelar os mais tardios.
 * `proposed` é o novo pedido; `conflicting` já deve ser o filtro do mesmo dia + serviço em comum.
 */
export function computeSameDayOverlapPlan(
  proposed: Date,
  proposedServiceIds: string[],
  conflicting: ConflictingAppointment[]
): SameDayOverlapPlan {
  if (conflicting.length === 0) return { kind: "none" };

  const union = new Set(proposedServiceIds);
  for (const c of conflicting) {
    for (const l of c.lines) {
      union.add(l.serviceId);
    }
  }

  const earliestMs = Math.min(proposed.getTime(), ...conflicting.map((c) => c.startAt.getTime()));

  const atEarliest = conflicting
    .filter((c) => c.startAt.getTime() === earliestMs)
    .sort((a, b) => a.id.localeCompare(b.id));
  const existingAtEarliest = atEarliest[0];

  if (existingAtEarliest) {
    const cancelIds = conflicting.filter((c) => c.id !== existingAtEarliest.id).map((c) => c.id);
    return {
      kind: "merge_into_existing",
      targetId: existingAtEarliest.id,
      cancelIds,
      unionServiceIds: [...union],
      anchorStartAt: existingAtEarliest.startAt,
    };
  }

  return {
    kind: "create_new",
    cancelIds: conflicting.map((c) => c.id),
    unionServiceIds: [...union],
    anchorStartAt: proposed,
  };
}
