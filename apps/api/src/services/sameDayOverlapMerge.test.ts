import { describe, expect, it } from "vitest";
import { computeSameDayOverlapPlan, filterSameDayServiceOverlap } from "./sameDayOverlapMerge.js";

const SVC_A = "00000000-0000-4000-8000-000000000001";
const SVC_B = "00000000-0000-4000-8000-000000000002";

/** Seg 20/04/2026 10h UTC — mesmo dia civil que 15h UTC em São Paulo (ainda 20/04). */
const DAY1_10 = new Date("2026-04-20T10:00:00.000Z");
const DAY1_15 = new Date("2026-04-20T15:00:00.000Z");

describe("filterSameDayServiceOverlap", () => {
  it("filtra por mesmo dia (São Paulo) e serviço em comum", () => {
    const list = [
      {
        id: "a1",
        startAt: DAY1_10,
        lines: [{ serviceId: SVC_A }],
      },
      {
        id: "a2",
        startAt: new Date("2026-04-21T10:00:00.000Z"),
        lines: [{ serviceId: SVC_A }],
      },
    ];
    const out = filterSameDayServiceOverlap(DAY1_15, [SVC_A], list);
    expect(out.map((x) => x.id)).toEqual(["a1"]);
  });
});

describe("computeSameDayOverlapPlan", () => {
  it("merge no existente mais cedo quando o novo é mais tarde", () => {
    const plan = computeSameDayOverlapPlan(
      DAY1_15,
      [SVC_A],
      [{ id: "a1", startAt: DAY1_10, lines: [{ serviceId: SVC_A }] }]
    );
    expect(plan.kind).toBe("merge_into_existing");
    if (plan.kind === "merge_into_existing") {
      expect(plan.targetId).toBe("a1");
      expect(plan.cancelIds).toEqual([]);
      expect(plan.unionServiceIds).toEqual([SVC_A]);
    }
  });

  it("cria no horário mais cedo e cancela o existente mais tarde", () => {
    const plan = computeSameDayOverlapPlan(
      DAY1_10,
      [SVC_A, SVC_B],
      [{ id: "late", startAt: DAY1_15, lines: [{ serviceId: SVC_A }] }]
    );
    expect(plan.kind).toBe("create_new");
    if (plan.kind === "create_new") {
      expect(plan.anchorStartAt.getTime()).toBe(DAY1_10.getTime());
      expect(plan.cancelIds).toEqual(["late"]);
      expect(new Set(plan.unionServiceIds)).toEqual(new Set([SVC_A, SVC_B]));
    }
  });

  it("sem conflito retorna none", () => {
    const plan = computeSameDayOverlapPlan(DAY1_10, [SVC_A], []);
    expect(plan.kind).toBe("none");
  });
});
