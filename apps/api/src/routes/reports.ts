import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { boundsForIsoYearWeek } from "../lib/isoWeek.js";

export const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(
    async (r) => {
      r.addHook("preHandler", fastify.authenticate);
      r.addHook("preHandler", fastify.requireRole("admin"));

      r.get("/weekly", async (request) => {
        const q = z
          .object({
            year: z.coerce.number().int().min(2000).max(2100),
            week: z.coerce.number().int().min(1).max(53),
          })
          .parse(request.query);

        const { start, end } = boundsForIsoYearWeek(q.year, q.week);

        const appointments = await r.prisma.appointment.findMany({
          where: {
            startAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            status: true,
            startAt: true,
            lines: { select: { serviceId: true, service: { select: { name: true } } } },
          },
        });

        const byStatus: Record<AppointmentStatus, number> = {
          pending_confirmation: 0,
          confirmed: 0,
          cancelled: 0,
        };
        for (const a of appointments) {
          byStatus[a.status] += 1;
        }

        const serviceCounts = new Map<string, { serviceId: string; name: string; count: number }>();
        for (const a of appointments) {
          for (const l of a.lines) {
            const cur = serviceCounts.get(l.serviceId) ?? {
              serviceId: l.serviceId,
              name: l.service.name,
              count: 0,
            };
            cur.count += 1;
            serviceCounts.set(l.serviceId, cur);
          }
        }

        const topServices = [...serviceCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10);

        return {
          week: { year: q.year, week: q.week, start: start.toISOString(), end: end.toISOString() },
          totals: {
            appointments: appointments.length,
            byStatus,
          },
          topServices,
        };
      });
    },
    { prefix: "/reports" }
  );
};
