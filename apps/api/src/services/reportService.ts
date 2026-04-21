import type { AppointmentStatus } from "@prisma/client";

export type ByStatusCounts = Record<AppointmentStatus, number>;

export type TopService = {
  serviceId: string;
  name: string;
  count: number;
};

export type RevenueByStatus = Record<AppointmentStatus, number>;

type AppointmentRow = {
  status: AppointmentStatus;
  lines: { serviceId: string; service: { name: string } }[];
};

type AppointmentRevenueRow = {
  status: AppointmentStatus;
  lines: { service: { priceCents: number } }[];
};

export function aggregateByStatus(appointments: AppointmentRow[]): ByStatusCounts {
  const counts: ByStatusCounts = {
    pending_confirmation: 0,
    confirmed: 0,
    cancelled: 0,
  };
  for (const a of appointments) {
    counts[a.status] += 1;
  }
  return counts;
}

export function topServices(appointments: AppointmentRow[], limit = 10): TopService[] {
  const map = new Map<string, TopService>();
  for (const a of appointments) {
    for (const l of a.lines) {
      const cur = map.get(l.serviceId) ?? { serviceId: l.serviceId, name: l.service.name, count: 0 };
      cur.count += 1;
      map.set(l.serviceId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function sumLinePricesCents(lines: AppointmentRevenueRow["lines"]): number {
  let sum = 0;
  for (const l of lines) {
    sum += l.service.priceCents;
  }
  return sum;
}

/** Soma dos preços dos serviços (catálogo atual) por agendamento, agrupada por estado do agendamento. */
export function aggregateRevenueByStatus(appointments: AppointmentRevenueRow[]): RevenueByStatus {
  const revenue: RevenueByStatus = {
    pending_confirmation: 0,
    confirmed: 0,
    cancelled: 0,
  };
  for (const a of appointments) {
    revenue[a.status] += sumLinePricesCents(a.lines);
  }
  return revenue;
}

export function totalRevenueCents(revenue: RevenueByStatus): number {
  return revenue.pending_confirmation + revenue.confirmed + revenue.cancelled;
}
