import type { PrismaClient } from "@prisma/client";
import { sameIsoWeekUtc } from "../lib/isoWeek.js";

export type SameWeekSuggestion = {
  code: "SAME_WEEK_MULTIPLE";
  message: string;
  /** Data/hora sugerida: mesmo horário do agendamento atual, no dia do primeiro da semana (mais antigo). */
  suggestedStartAt: string;
  /** Sempre o agendamento com `startAt` mais antigo na mesma semana ISO — destino correto do merge. */
  firstAppointmentId: string;
};

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

  const inWeek = all.filter((o) => sameIsoWeekUtc(o.startAt, proposedStartAt));
  if (inWeek.length < 2) return null;

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
      "Detectamos mais de um agendamento na mesma semana. Recomendamos concentrar os serviços no dia do primeiro agendamento dessa semana.",
    suggestedStartAt: suggested.toISOString(),
    firstAppointmentId: anchor.id,
  };
}
