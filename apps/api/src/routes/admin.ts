import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { OperationalStatus, AppointmentStatus } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { assertStartAtStrictlyInFuture } from "../lib/startAtPolicy.js";

const patchAdminSchema = z.object({
  startAt: z.string().datetime().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

function appointmentSelect() {
  return {
    id: true,
    customerId: true,
    startAt: true,
    status: true,
    confirmedAt: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    customer: { select: { id: true, name: true, email: true } },
    lines: {
      select: {
        id: true,
        operationalStatus: true,
        service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
    },
  } as const;
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(
    async (r) => {
      r.addHook("preHandler", fastify.authenticate);
      r.addHook("preHandler", fastify.requireRole("admin"));

      r.get("/appointments", async (request) => {
        const q = z
          .object({
            customerId: z.string().uuid().optional(),
            status: z.nativeEnum(AppointmentStatus).optional(),
          })
          .parse(request.query);

        const appointments = await r.prisma.appointment.findMany({
          where: {
            customerId: q.customerId,
            status: q.status,
          },
          orderBy: { startAt: "asc" },
          select: appointmentSelect(),
        });

        return { appointments };
      });

      r.patch("/appointments/:id", async (request) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = patchAdminSchema.parse(request.body);
        const actorId = request.user.sub;

        const existing = await r.prisma.appointment.findUnique({ where: { id: params.id } });
        if (!existing) {
          throw new AppError("NOT_FOUND", "Agendamento não encontrado", 404);
        }

        const data: {
          startAt?: Date;
          status?: AppointmentStatus;
          notes?: string | null;
          confirmedAt?: Date | null;
        } = {};

        if (body.startAt) {
          const nextStart = new Date(body.startAt);
          assertStartAtStrictlyInFuture(nextStart);
          data.startAt = nextStart;
        }
        if (body.notes !== undefined) data.notes = body.notes;
        if (body.status) {
          data.status = body.status;
          if (body.status === "confirmed" && existing.status !== "confirmed") {
            data.confirmedAt = new Date();
          } else if (body.status !== "confirmed") {
            data.confirmedAt = null;
          }
        }

        const appointment = await r.prisma.appointment.update({
          where: { id: existing.id },
          data,
          select: appointmentSelect(),
        });

        await r.prisma.appointmentAuditLog.create({
          data: {
            appointmentId: appointment.id,
            actorUserId: actorId,
            action: "admin_update",
            payloadJson: body as object,
          },
        });

        return { appointment };
      });

      r.post("/appointments/:id/confirm", async (request) => {
        const params = z.object({ id: z.string().uuid() }).parse(request.params);
        const actorId = request.user.sub;

        const existing = await r.prisma.appointment.findUnique({ where: { id: params.id } });
        if (!existing) {
          throw new AppError("NOT_FOUND", "Agendamento não encontrado", 404);
        }

        const appointment = await r.prisma.appointment.update({
          where: { id: existing.id },
          data: {
            status: "confirmed",
            confirmedAt: new Date(),
          },
          select: appointmentSelect(),
        });

        await r.prisma.appointmentAuditLog.create({
          data: {
            appointmentId: appointment.id,
            actorUserId: actorId,
            action: "admin_confirm",
            payloadJson: {},
          },
        });

        return { appointment };
      });

      r.patch("/appointments/:id/services/:lineId", async (request) => {
        const params = z
          .object({ id: z.string().uuid(), lineId: z.string().uuid() })
          .parse(request.params);
        const body = z
          .object({ operationalStatus: z.nativeEnum(OperationalStatus) })
          .parse(request.body);
        const actorId = request.user.sub;

        const line = await r.prisma.appointmentService.findFirst({
          where: { id: params.lineId, appointmentId: params.id },
        });
        if (!line) {
          throw new AppError("NOT_FOUND", "Linha de serviço não encontrada", 404);
        }

        const updated = await r.prisma.appointmentService.update({
          where: { id: line.id },
          data: { operationalStatus: body.operationalStatus },
          select: {
            id: true,
            operationalStatus: true,
            service: { select: { id: true, name: true } },
          },
        });

        await r.prisma.appointmentAuditLog.create({
          data: {
            appointmentId: params.id,
            actorUserId: actorId,
            action: "admin_service_status",
            payloadJson: { lineId: params.lineId, operationalStatus: body.operationalStatus },
          },
        });

        return { line: updated };
      });
    },
    { prefix: "/admin" }
  );
};
