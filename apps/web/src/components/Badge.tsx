import { appointmentStatusLabel, operationalStatusLabel } from "../utils/statusLabels";

function badgeClassForStatus(value: string): string {
  const v = value.toLowerCase();
  if (v === "pending_confirmation" || v === "pending") return "badge-pending";
  if (v === "confirmed") return "badge-confirmed";
  if (v === "cancelled") return "badge-cancelled";
  if (v === "completed" || v === "done") return "badge-done";
  if (v === "in_progress") return "badge-inprogress";
  return "badge-neutral";
}

const LABELS_PT: Record<string, string> = {
  ...appointmentStatusLabel,
  ...operationalStatusLabel,
};

function labelForStatus(value: string): string {
  return LABELS_PT[value] ?? "Desconhecido";
}

type BadgeProps = {
  value: string;
};

export function Badge({ value }: BadgeProps) {
  const cls = badgeClassForStatus(value);
  return (
    <span className={`badge ${cls}`} title={labelForStatus(value)}>
      {labelForStatus(value)}
    </span>
  );
}
