/** Tipos usados exclusivamente pelas páginas do painel administrativo. */

export type AdminAppointmentLine = {
  id: string;
  operationalStatus: string;
  service: { id: string; name: string };
};

export type AdminAppointment = {
  id: string;
  startAt: string;
  status: string;
  notes: string | null;
  customer: { name: string; email: string };
  lines: AdminAppointmentLine[];
};

export type WeeklyReport = {
  week: { year: number; week: number; start: string; end: string };
  totals: {
    appointments: number;
    byStatus: {
      pending_confirmation: number;
      confirmed: number;
      cancelled: number;
    };
  };
  topServices: { serviceId: string; name: string; count: number }[];
};
