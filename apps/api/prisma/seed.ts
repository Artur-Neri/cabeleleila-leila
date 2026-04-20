import { PrismaClient, UserRole, AppointmentStatus, OperationalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function atUtcHour(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const customerHash = await bcrypt.hash("cliente123", 10);

  await prisma.appointmentAuditLog.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.local",
      passwordHash: adminHash,
      name: "Leila",
      phone: "11999990001",
      role: UserRole.admin,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "cliente@demo.local",
      passwordHash: customerHash,
      name: "Cliente Demo",
      phone: "11988887777",
      role: UserRole.customer,
    },
  });

  const services = await prisma.$transaction([
    prisma.service.create({
      data: { name: "Corte", durationMinutes: 45, priceCents: 3500 },
    }),
    prisma.service.create({
      data: { name: "Manicure", durationMinutes: 60, priceCents: 4000 },
    }),
    prisma.service.create({
      data: { name: "Coloração", durationMinutes: 120, priceCents: 12000 },
    }),
    prisma.service.create({
      data: { name: "Escova", durationMinutes: 30, priceCents: 2500 },
    }),
  ]);

  const now = new Date();

  // Cliente pode alterar: > 2 dias até startAt
  const farAppointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      startAt: atUtcHour(addDays(now, 10), 14, 0),
      status: AppointmentStatus.pending_confirmation,
      notes: "Seed: cliente pode alterar (mais de 2 dias)",
      createdByRole: UserRole.customer,
      lines: {
        create: [{ serviceId: services[0].id }, { serviceId: services[1].id }],
      },
    },
  });

  // Cliente NÃO pode alterar: < 2 dias
  const soonAppointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      startAt: atUtcHour(addDays(now, 1), 10, 0),
      status: AppointmentStatus.confirmed,
      confirmedAt: addDays(now, -1),
      notes: "Seed: cliente bloqueado (< 2 dias)",
      createdByRole: UserRole.customer,
      lines: {
        create: [
          {
            serviceId: services[2].id,
            operationalStatus: OperationalStatus.pending,
          },
        ],
      },
    },
  });

  // Dois agendamentos na mesma semana ISO (UTC) para sugestão
  const w0 = addDays(now, 5);
  const w1 = addDays(now, 6);
  await prisma.appointment.create({
    data: {
      customerId: customer.id,
      startAt: atUtcHour(w0, 9, 0),
      status: AppointmentStatus.pending_confirmation,
      notes: "Seed: mesma semana (A)",
      createdByRole: UserRole.customer,
      lines: { create: [{ serviceId: services[0].id }] },
    },
  });
  await prisma.appointment.create({
    data: {
      customerId: customer.id,
      startAt: atUtcHour(w1, 11, 0),
      status: AppointmentStatus.pending_confirmation,
      notes: "Seed: mesma semana (B)",
      createdByRole: UserRole.customer,
      lines: { create: [{ serviceId: services[3].id }] },
    },
  });

  await prisma.appointmentAuditLog.create({
    data: {
      appointmentId: soonAppointment.id,
      actorUserId: admin.id,
      action: "admin_seed_note",
      payloadJson: { message: "Exemplo de log de auditoria" },
    },
  });

  console.log("Seed OK:", { admin: admin.email, customer: customer.email, farAppointment: farAppointment.id });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
