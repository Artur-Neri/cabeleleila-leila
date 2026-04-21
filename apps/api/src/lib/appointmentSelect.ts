/**
 * Selects de Prisma compartilhados entre as rotas de cliente e admin.
 *
 * - customerAppointmentSelect: campos visíveis pelo próprio cliente (sem dados de outros usuários)
 * - adminAppointmentSelect: inclui customerId + customer para uso administrativo
 */

export function customerAppointmentSelect() {
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

export function adminAppointmentSelect() {
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
