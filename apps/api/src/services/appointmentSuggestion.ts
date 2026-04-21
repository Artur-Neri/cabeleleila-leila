import type { PrismaClient } from "@prisma/client";
import { sameIsoWeekUtc } from "../lib/isoWeek.js";

export type SameWeekSuggestion = {
  code: "SAME_WEEK_MULTIPLE";
  message: string;
  /** Data/hora sugerida: mesmo horário do agendamento atual, no dia do primeiro da semana (mais antigo). */
  suggestedStartAt: string;
  /** Sempre o agendamento com `startAt` mais antigo na semana ISO — destino correto do merge. */
  firstAppointmentId: string;
};

/** Usada no GET de detalhe e no PATCH: só sugere se já existem 2+ na semana (situação consolidada). */
export async function maybeSameWeekSuggestion(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date }
): Promise<SameWeekSuggestion | null> {
  return _suggestion(prisma, params, 2);
}

/**
 * Usada no preview de novo agendamento: sugere se já existe pelo menos 1 ativo na semana,
 * pois o próximo POST criaria o 2º (ou mais).
 */
export async function previewMergeIfAddingAnother(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date }
): Promise<SameWeekSuggestion | null> {
  return _suggestion(prisma, params, 1);
}

async function _suggestion(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date },
  minInWeek: number
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

  const inWeek = all.filter((o) => sameIsoWeekUtc(o.startAt, proposedStartAt));
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
