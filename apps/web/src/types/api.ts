export type AppointmentLine = {
  id: string;
  operationalStatus: string;
  service: { id: string; name: string };
};

export type Appointment = {
  id: string;
  startAt: string;
  status: string;
  notes: string | null;
  lines: AppointmentLine[];
};

export type Suggestion = {
  message: string;
  suggestedStartAt: string;
  firstAppointmentId: string;
} | null;
