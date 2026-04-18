import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  await fastify.register(jwt, { secret });

  fastify.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        await reply.status(401).send({
          error: { code: "UNAUTHORIZED", message: "Token inválido ou ausente" },
        });
      }
    }
  );

  fastify.decorate(
    "requireRole",
    function requireRole(role: UserRole) {
      return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
        await fastify.authenticate(request, reply);
        if (reply.sent) return;
        if (request.user.role !== role) {
          await reply.status(403).send({
            error: { code: "FORBIDDEN", message: "Permissão insuficiente" },
          });
        }
      };
    }
  );
};

export default fp(authPlugin, { name: "auth", encapsulate: false });

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (role: UserRole) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
