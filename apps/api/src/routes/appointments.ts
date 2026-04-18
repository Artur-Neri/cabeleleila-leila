import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { assertStartAtStrictlyInFuture } from "../lib/startAtPolicy.js";
import { canCustomerReschedule } from "../services/appointmentPolicy.js";
import { maybeSameWeekSuggestion } from "../services/appointmentSuggestion.js";

const createSchema = z.object({
  startAt: z.string().datetime(),
  serviceIds: z.array(z.string().uuid()).min(1),
  notes: z.string().max(2000).optional(),
});

const patchCustomerSchema = z.object({
  startAt: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const mergeSchema = z.object({
  targetAppointmentId: z.string().uuid(),
});

function appointmentSelect() {
  return {
    id: true,
    startAt: true,
    status: true,
    confirmedAt: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    lines: {
      select: {
        id: true,
        operationalStatus: true,
        service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
    },
  } as const;
}

export const appointmentsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(
    async (r) => {
      r.addHook("preHandler", fastify.authenticate);
      r.addHook("preHandler", fastify.requireRole("customer"));

      r.post("/", async (request) => {
        const body = createSchema.parse(request.body);
        const startAt = new Date(body.startAt);
        assertStartAtStrictlyInFuture(startAt);

        const services = await r.prisma.service.findMany({
          where: { id: { in: body.serviceIds }, active: true },
        });
        if (services.length !== body.serviceIds.length) {
          throw new AppError("INVALID_SERVICES", "Um ou mais serviços são inválidos", 400);
        }

        const customerId = request.user.sub;

        const appointment = await r.prisma.appointment.create({
          data: {
            customerId,
            startAt,
            notes: body.notes,
            createdByRole: "customer",
            lines: {
              create: body.serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
          select: appointmentSelect(),
        });

        const suggestion = await maybeSameWeekSuggestion(r.prisma, {
          customerId,
          proposedStartAt: startAt,
          excludeAppointmentId: appointment.id,
        });

        return { appointment, suggestion };
      });

      r.get("/", async (request) => {
        const q = z
          .object({
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
          })
          .parse(request.query);

        const customerId = request.user.sub;
        const where: {
          customerId: string;
          startAt?: { gte?: Date; lte?: Date };
        } = { customerId };

        if (q.from || q.to) {
          where.startAt = {};
          if (q.from) where.startAt.gte = new Date(q.from);
          if (q.to) where.startAt.lte = new Date(q.to);
        }

        const appointments = await r.prisma.appointment.findMany({
          where,
          orderBy: { startAt: "desc" },
          select: appointmentSelect(),
        });

        return { appointments };
      });

      r.get("/history", async (request) => {
        const q = z
          .object({
            from: z.string().datetime(),
            to: z.string().datetime(),
          })
          .parse(request.query);

        const customerId = request.user.sub;
        const from = new Date(q.from);
        const to = new Date(q.to);
        if (from.getTime() > to.getTime()) {
          throw new AppError("INVALID_RANGE", "Intervalo inválido", 400);
        }

        const appointments = await r.prisma.appointment.findMany({
          where: {
            customerId,
            startAt: { gte: from, lte: to },
          },
          orderBy: { startAt: "desc" },
          select: appointmentSelect(),
        });

        return { appointments };
      });

      r.get("/:id", async (request) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const customerId = request.user.sub;
        const appointment = await r.prisma.appointment.findFirst({
          where: { id: params.id, customerId },
          select: appointmentSelect(),
        });
        if (!appointment) {
          throw new AppError("NOT_FOUND", "Agendamento não encontrado", 404);
        }

        const suggestion = await maybeSameWeekSuggestion(r.prisma, {
          customerId,
          proposedStartAt: appointment.startAt,
          excludeAppointmentId: appointment.id,
        });

        return { appointment, suggestion };
      });

      r.patch("/:id", async (request) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = patchCustomerSchema.parse(request.body);
        const customerId = request.user.sub;

        const existing = await r.prisma.appointment.findFirst({
          where: { id: params.id, customerId },
        });
        if (!existing) {
          throw new AppError("NOT_FOUND", "Agendamento não encontrado", 404);
        }

        const now = new Date();
        if (body.startAt) {
          assertStartAtStrictlyInFuture(new Date(body.startAt), now);
        }

        if (!canCustomerReschedule(existing.startAt, now)) {
          throw new AppError(
            "RESCHEDULE_WINDOW",
            "As alterações só são permitidas com mais de 2 dias de antecedência. Entre em contato com o salão por telefone.",
            403
          );
        }

        const nextStartAt = body.startAt ? new Date(body.startAt) : existing.startAt;
        if (body.startAt && !canCustomerReschedule(nextStartAt, now)) {
          throw new AppError(
            "RESCHEDULE_WINDOW",
            "A nova data também precisa ter mais de 2 dias de antecedência.",
            403
          );
        }

        const appointment = await r.prisma.appointment.update({
          where: { id: existing.id },
          data: {
            startAt: body.startAt ? new Date(body.startAt) : undefined,
            notes: body.notes === undefined ? undefined : body.notes,
          },
          select: appointmentSelect(),
        });

        await r.prisma.appointmentAuditLog.create({
          data: {
            appointmentId: appointment.id,
            actorUserId: customerId,
            action: "customer_update",
            payloadJson: body as object,
          },
        });

        const suggestion = await maybeSameWeekSuggestion(r.prisma, {
          customerId,
          proposedStartAt: appointment.startAt,
          excludeAppointmentId: appointment.id,
        });

        return { appointment, suggestion };
      });

      r.post("/:id/merge", async (request) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = mergeSchema.parse(request.body);
        const customerId = request.user.sub;

        if (params.id === body.targetAppointmentId) {
          throw new AppError("MERGE_SAME", "Os agendamentos de origem e destino são iguais", 400);
        }

        const [source, target] = await Promise.all([
          r.prisma.appointment.findFirst({
            where: { id: params.id, customerId },
            select: { id: true, status: true, startAt: true, lines: { select: { serviceId: true } } },
          }),
          r.prisma.appointment.findFirst({
            where: { id: body.targetAppointmentId, customerId },
            select: { id: true, status: true, startAt: true, lines: { select: { serviceId: true } } },
          }),
        ]);

        if (!source) throw new AppError("NOT_FOUND", "Agendamento de origem não encontrado", 404);
        if (!target) throw new AppError("NOT_FOUND", "Agendamento de destino não encontrado", 404);
        if (source.status === "cancelled") {
          throw new AppError("ALREADY_CANCELLED", "O agendamento de origem já está cancelado", 400);
        }
        if (target.status === "cancelled") {
          throw new AppError("TARGET_CANCELLED", "O agendamento de destino está cancelado", 400);
        }

        const targetServiceIds = new Set(target.lines.map((l) => l.serviceId));
        const newServiceIds = source.lines
          .map((l) => l.serviceId)
          .filter((sid) => !targetServiceIds.has(sid));

        await r.prisma.$transaction([
          ...(newServiceIds.length > 0
            ? [
                r.prisma.appointmentService.createMany({
                  data: newServiceIds.map((serviceId) => ({
                    appointmentId: target.id,
                    serviceId,
                  })),
                }),
              ]
            : []),
          r.prisma.appointment.update({
            where: { id: source.id },
            data: { status: "cancelled" },
          }),
          r.prisma.appointmentAuditLog.create({
            data: {
              appointmentId: source.id,
              actorUserId: customerId,
              action: "merged_into",
              payloadJson: { targetAppointmentId: target.id } as object,
            },
          }),
          r.prisma.appointmentAuditLog.create({
            data: {
              appointmentId: target.id,
              actorUserId: customerId,
              action: "received_merge",
              payloadJson: {
                sourceAppointmentId: source.id,
                addedServiceIds: newServiceIds,
              } as object,
            },
          }),
        ]);

        const merged = await r.prisma.appointment.findFirst({
          where: { id: target.id },
          select: appointmentSelect(),
        });

        return { appointment: merged };
      });
    },
    { prefix: "/appointments" }
  );
};
