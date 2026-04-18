import type { FastifyPluginAsync } from "fastify";

export const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/services", async () => {
    const services = await fastify.prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return { services };
  });
};
