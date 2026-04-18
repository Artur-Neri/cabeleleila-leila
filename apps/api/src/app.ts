import Fastify from "fastify";
import { ZodError } from "zod";
import { isAppError } from "./lib/errors.js";
import prismaPlugin from "./plugins/prisma.js";
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { servicesRoutes } from "./routes/services.js";
import { appointmentsRoutes } from "./routes/appointments.js";
import { adminRoutes } from "./routes/admin.js";
import { reportsRoutes } from "./routes/reports.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(prismaPlugin);
  await app.register(corsPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(servicesRoutes);
  await app.register(appointmentsRoutes);
  await app.register(adminRoutes);
  await app.register(reportsRoutes);

  app.setErrorHandler((error, request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION",
          message: "Pedido inválido",
          details: error.flatten(),
        },
      });
    }
    app.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL", message: "Erro interno" },
    });
  });

  return app;
}
