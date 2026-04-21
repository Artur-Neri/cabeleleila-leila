import type { AppointmentStatus } from "@prisma/client";

export type ByStatusCounts = Record<AppointmentStatus, number>;

export type TopService = {
  serviceId: string;
  name: string;
  count: number;
};

type AppointmentRow = {
  status: AppointmentStatus;
  lines: { serviceId: string; service: { name: string } }[];
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
