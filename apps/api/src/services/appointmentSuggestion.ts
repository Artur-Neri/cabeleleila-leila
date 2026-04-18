import type { PrismaClient } from "@prisma/client";
import { sameIsoWeekUtc } from "../lib/isoWeek.js";

export type SameWeekSuggestion = {
  code: "SAME_WEEK_MULTIPLE";
  message: string;
  /** Data/hora sugerida: mesmo horário pedido, mas no dia do primeiro agendamento da semana. */
  suggestedStartAt: string;
  firstAppointmentId: string;
};

export async function maybeSameWeekSuggestion(
  prisma: PrismaClient,
  params: { customerId: string; proposedStartAt: Date; excludeAppointmentId?: string }
): Promise<SameWeekSuggestion | null> {
  const { customerId, proposedStartAt, excludeAppointmentId } = params;

  const others = await prisma.appointment.findMany({
    where: {
      customerId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { not: "cancelled" },
    },
    select: { id: true, startAt: true },
    orderBy: { startAt: "asc" },
  });

  const sameWeek = others.filter((o) => sameIsoWeekUtc(o.startAt, proposedStartAt));
  if (sameWeek.length === 0) return null;

  const first = sameWeek[0];
  if (!first) return null;

  const firstDayUtc = Date.UTC(
    first.startAt.getUTCFullYear(),
    first.startAt.getUTCMonth(),
    first.startAt.getUTCDate()
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
    firstAppointmentId: first.id,
  };
}
