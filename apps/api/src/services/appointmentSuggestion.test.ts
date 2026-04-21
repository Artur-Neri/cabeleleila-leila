import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { maybeSameWeekSuggestion, previewMergeIfAddingAnother } from "./appointmentSuggestion.js";

/** Monta um PrismaClient mínimo cujo appointment.findMany retorna a lista dada. */
function mockPrisma(rows: { id: string; startAt: Date }[]): PrismaClient {
  return {
    appointment: {
      findMany: async () => rows,
    },
  } as unknown as PrismaClient;
}

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
    });
    expect(result).toBeNull();
  });

  it("retorna sugestão quando já existe 1 agendamento na semana", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W17_MON }]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).not.toBeNull();
    expect(result!.firstAppointmentId).toBe("a1");
    // hora sugerida = dia da âncora (seg) + horário proposto (10h)
    expect(new Date(result!.suggestedStartAt).toISOString()).toBe(W17_MON.toISOString());
  });

  it("usa o agendamento mais antigo como âncora quando há vários", async () => {
    const prisma = mockPrisma([
      { id: "a1", startAt: W17_MON },
      { id: "a2", startAt: W17_WED },
    ]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_FRI,
    });
    expect(result!.firstAppointmentId).toBe("a1");
  });

  it("retorna null quando o único agendamento ativo é de outra semana", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W18_MON }]);
    const result = await previewMergeIfAddingAnother(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).toBeNull();
  });
});

describe("maybeSameWeekSuggestion", () => {
  it("retorna null com apenas 1 agendamento na semana", async () => {
    const prisma = mockPrisma([{ id: "a1", startAt: W17_MON }]);
    const result = await maybeSameWeekSuggestion(prisma, {
      customerId: "c1",
      proposedStartAt: W17_WED,
    });
    expect(result).toBeNull();
  });

  it("retorna sugestão com 2 agendamentos na semana", async () => {
    const prisma = mockPrisma([
      { id: "a1", startAt: W17_MON },
      { id: "a2", startAt: W17_WED },
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
