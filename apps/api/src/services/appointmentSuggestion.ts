import type { PrismaClient } from "@prisma/client";
import { sameIsoWeekUtc } from "../lib/isoWeek.js";
import { filterSameDayServiceOverlap } from "./sameDayOverlapMerge.js";

export type SameWeekSuggestion = {
  code: "SAME_WEEK_MULTIPLE";
  message: string;
  /** Data/hora sugerida: mesmo horário do agendamento atual, no dia do primeiro da semana (mais antigo). */
  suggestedStartAt: string;
  /** Sempre o agendamento com `startAt` mais antigo na semana ISO — destino correto do merge. */
  firstAppointmentId: string;
};

/** Monta sugestão de “vários na mesma semana” a partir de linhas já carregadas. */
export function buildSameWeekSuggestion(
  rows: { id: string; startAt: Date }[],
  proposedStartAt: Date,
  minInWeek: number
): SameWeekSuggestion | null {
  const inWeek = rows.filter((o) => sameIsoWeekUtc(o.startAt, proposedStartAt));
  if (inWeek.length < minInWeek) return null;

  const anchor = inWeek[0];
  if (!anchor) return null;

  const firstDayUtc = Date.UTC(
    anchor.startAt.getUTCFullYear(),
    anchor.startAt.getUTCMonth(),
    anchor.startAt.getUTCDate()
  );

  const proposedTimeMs =
    proposedStartAt.getUTCHours() * 3600000 +
    proposedStartAt.getUTCMinutes() * 60000 +
    proposedStartAt.getUTCSeconds() * 1000;

  const suggested = new Date(firstDayUtc + proposedTimeMs);

  return {
    code: "SAME_WEEK_MULTIPLE",
    message:
      "Você já tem um agendamento nesta semana. Recomendamos concentrar todos os serviços no mesmo dia.",
    suggestedStartAt: suggested.toISOString(),
    firstAppointmentId: anchor.id,
  };
}

/** Usada no GET de detalhe e no PATCH: só sugere se já existem 2+ na semana (situação consolidada). */
export async function maybeSameWeekSuggestion(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date }
): Promise<SameWeekSuggestion | null> {
  const { customerId, proposedStartAt } = params;

  const all = await prisma.appointment.findMany({
    where: {
      customerId,
      status: { not: "cancelled" },
    },
    select: { id: true, startAt: true },
    orderBy: { startAt: "asc" },
  });

  return buildSameWeekSuggestion(all, proposedStartAt, 2);
}

/**
 * Preview de novo agendamento: se já existe 1+ na semana ISO, sugere unir — exceto quando
 * há o mesmo serviço no mesmo dia (nesse caso o POST faz merge automático e não mostramos preview).
 */
export async function previewMergeIfAddingAnother(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date; proposedServiceIds: string[] }
): Promise<SameWeekSuggestion | null> {
  const { customerId, proposedStartAt, proposedServiceIds } = params;

  const all = await prisma.appointment.findMany({
    where: {
      customerId,
      status: { not: "cancelled" },
    },
    select: { id: true, startAt: true, lines: { select: { serviceId: true } } },
    orderBy: { startAt: "asc" },
  });

  const conflicting = filterSameDayServiceOverlap(proposedStartAt, proposedServiceIds, all);
  if (conflicting.length > 0) return null;

  return buildSameWeekSuggestion(
    all.map(({ id, startAt }) => ({ id, startAt })),
    proposedStartAt,
    1
  );
}
