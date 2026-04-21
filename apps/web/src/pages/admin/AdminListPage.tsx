import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import { formatDateTimePtBr } from "../../utils/formatDateTime";
import { appointmentStatusLabel } from "../../utils/statusLabels";
import type { AdminAppointment } from "../../types/admin";

type DatePreset = "today" | "week" | "all";

function dateRangeForPreset(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (preset === "today") {
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
  }
  // week: hoje até +7 dias
  const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from: startOfDay.toISOString(), to: endOfWeek.toISOString() };
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "pending_confirmation", label: appointmentStatusLabel["pending_confirmation"] },
  { value: "confirmed", label: appointmentStatusLabel["confirmed"] },
  { value: "cancelled", label: appointmentStatusLabel["cancelled"] },
] as const;

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Próximos 7 dias" },
  { value: "all", label: "Todas as datas" },
];

export function AdminListPage() {
  const [items, setItems] = useState<AdminAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending_confirmation");
  const [datePreset, setDatePreset] = useState<DatePreset>("week");
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async (status: string, preset: DatePreset) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const range = dateRangeForPreset(preset);
      if (range.from) qs.set("from", range.from);
      if (range.to) qs.set("to", range.to);
      const res = await apiFetch<{ appointments: AdminAppointment[] }>(
        `/admin/appointments?${qs.toString()}`
      );
      setItems(res.appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(statusFilter, datePreset);
  }, [load, statusFilter, datePreset]);

  async function confirmAppointment(id: string) {
    setConfirming(id);
    try {
      await apiFetch(`/admin/appointments/${id}/confirm`, { method: "POST", json: {} });
      await load(statusFilter, datePreset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao confirmar");
    } finally {
      setConfirming(null);
    }
  }

  const pendingCount = items.filter((a) => a.status === "pending_confirmation").length;

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Agendamentos</h2>
          {!loading && pendingCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#92400e" }}>
              {pendingCount} aguardando confirmação
            </p>
          )}
        </div>

        <div className="row" style={{ gap: "0.5rem" }}>
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
            style={{ width: "auto" }}
            aria-label="Filtrar por período"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto" }}
            aria-label="Filtrar por estado"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <Spinner label="Carregando…" />
      ) : items.length === 0 ? (
        <p className="text-muted">Nenhum agendamento encontrado para os filtros selecionados.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Data</th>
              <th>Estado</th>
              <th>Serviços</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className={a.status === "pending_confirmation" ? "row-pending" : ""}>
                <td>
                  {a.customer.name}
                  <br />
                  <small className="text-muted">{a.customer.email}</small>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDateTimePtBr(a.startAt)}</td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td style={{ fontSize: "0.85rem" }}>
                  {a.lines.map((l) => l.service.name).join(", ")}
                </td>
                <td>
                  <div className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                    <Link to={`/admin/agendamento/${a.id}`} className="link-pill">
                      Gerenciar
                    </Link>
                    {a.status === "pending_confirmation" ? (
                      <button
                        type="button"
                        style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}
                        disabled={confirming === a.id}
                        onClick={() => confirmAppointment(a.id)}
                      >
                        {confirming === a.id ? "…" : "Confirmar"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
