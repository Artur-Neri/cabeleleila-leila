import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().trim().min(1, "Informe o nome"),
  phone: z
    .string()
    .trim()
    .min(10, "Informe o telefone com DDD (mínimo 10 caracteres)")
    .max(20),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await fastify.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "E-mail ou senha incorretos", 401);
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new AppError("INVALID_CREDENTIALS", "E-mail ou senha incorretos", 401);
    }
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
    };
  });

  fastify.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const exists = await fastify.prisma.user.findUnique({ where: { email: body.email } });
    if (exists) {
      throw new AppError("EMAIL_IN_USE", "Este e-mail já está cadastrado", 409);
    }
    const passwordHash = await hashPassword(body.password);
    const user = await fastify.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        phone: body.phone,
        role: "customer",
      },
    });
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
    };
  });
};
