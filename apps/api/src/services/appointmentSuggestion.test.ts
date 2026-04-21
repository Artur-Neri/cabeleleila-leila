import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { maybeSameWeekSuggestion, previewMergeIfAddingAnother } from "./appointmentSuggestion.js";

/** Monta um PrismaClient mínimo cujo appointment.findMany retorna a lista dada. */
function mockPrisma(
  rows: { id: string; startAt: Date; lines?: { serviceId: string }[] }[]
): PrismaClient {
  return {
    appointment: {
      findMany: async () =>
        rows.map((r) => ({
          id: r.id,
          startAt: r.startAt,
          lines: r.lines ?? [],
        })),
    },
  } as unknown as PrismaClient;
}

const SVC_A = "00000000-0000-4000-8000-000000000001";

// Semana ISO 2026-W17: 20–26 Abr 2026 (UTC)
const W17_MON = new Date("2026-04-20T10:00:00.000Z"); // segunda
const W17_WED = new Date("2026-04-22T10:00:00.000Z"); // quarta
const W17_FRI = new Date("2026-04-24T10:00:00.000Z"); // sexta
const W18_MON = new Date("2026-04-27T10:00:00.000Z"); // semana seguinte

describe("previewMergeIfAddingAnother", () => {
  it("retorna null quando não há agendamentos na semana", async () => {
    const prisma = mockPrisma([]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
      proposedServiceIds: [SVC_A],
    });
    expect(result).toBeNull();
  });

  it("retorna sugestão quando já existe 1 agendamento na semana (sem mesmo serviço no mesmo dia)", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W17_MON, lines: [{ serviceId: SVC_A }] }]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
      proposedServiceIds: [SVC_A],
    });
    expect(result).not.toBeNull();
    expect(result!.firstAppointmentId).toBe("a1");
    expect(new Date(result!.suggestedStartAt).toISOString()).toBe(W17_MON.toISOString());
  });

  it("retorna null quando há o mesmo serviço no mesmo dia (merge automático no POST)", async () => {
    const sameDayLater = new Date("2026-04-20T15:00:00.000Z");
    const prisma = mockPrisma([
      { id: "a1", startAt: W17_MON, lines: [{ serviceId: SVC_A }] },
    ]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: sameDayLater,
      proposedServiceIds: [SVC_A],
    });
    expect(result).toBeNull();
  });

  it("usa o agendamento mais antigo como âncora quando há vários", async () => {
    const prisma = mockPrisma([
      { id: "a1", startAt: W17_MON, lines: [{ serviceId: SVC_A }] },
      { id: "a2", startAt: W17_WED, lines: [{ serviceId: SVC_A }] },
    ]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_FRI,
      proposedServiceIds: [SVC_A],
    });
    expect(result!.firstAppointmentId).toBe("a1");
  });

  it("retorna null quando o único agendamento ativo é de outra semana", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W18_MON, lines: [{ serviceId: SVC_A }] }]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
      proposedServiceIds: [SVC_A],
    });
    expect(result).toBeNull();
  });
});

describe("maybeSameWeekSuggestion", () => {
  it("retorna null com apenas 1 agendamento na semana", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W17_MON, lines: [] }]);
    const result = await maybeSameWeekSuggestion(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).toBeNull();
  });

  it("retorna sugestão com 2 agendamentos na semana", async () => {
    const prisma = mockPrisma([
      { id: "a1", startAt: W17_MON, lines: [] },
      { id: "a2", startAt: W17_WED, lines: [] },
    ]);
    const result = await maybeSameWeekSuggestion(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).not.toBeNull();
    expect(result!.firstAppointmentId).toBe("a1");
  });

  it("retorna null com 0 agendamentos", async () => {
    const prisma = mockPrisma([]);
    const result = await maybeSameWeekSuggestion(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).toBeNull();
  });
});
