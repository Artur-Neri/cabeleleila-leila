import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { boundsForIsoYearWeek } from "../lib/isoWeek.js";
import {
  aggregateByStatus,
  aggregateRevenueByStatus,
  topServices,
  totalRevenueCents,
} from "../services/reportService.js";

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
          where: { startAt: { gte: start, lte: end } },
          select: {
            id: true,
            status: true,
            startAt: true,
            lines: {
              select: { serviceId: true, service: { select: { name: true, priceCents: true } } },
            },
          },
        });

        const revenueByStatus = aggregateRevenueByStatus(appointments);

        return {
          week: { year: q.year, week: q.week, start: start.toISOString(), end: end.toISOString() },
          totals: {
            appointments: appointments.length,
            byStatus: aggregateByStatus(appointments),
            revenueCents: {
              total: totalRevenueCents(revenueByStatus),
              byStatus: revenueByStatus,
            },
          },
          topServices: topServices(appointments),
        };
      });
    },
    { prefix: "/reports" }
  );
};
