import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import { isDatetimeLocalStrictlyInFuture, useMinDatetimeLocal } from "../../utils/datetimeLocal";
import { appointmentStatusLabel, operationalStatusLabel } from "../../utils/statusLabels";

type Appointment = {
  id: string;
  startAt: string;
  status: string;
  notes: string | null;
  customer: { name: string; email: string };
  lines: {
    id: string;
    operationalStatus: string;
    service: { id: string; name: string };
  }[];
};

const statuses = ["pending_confirmation", "confirmed", "cancelled"] as const;
const opStatuses = ["pending", "in_progress", "completed"] as const;

const MENSAGENS_SUCESSO = new Set([
  "Dados salvos.",
  "Agendamento confirmado.",
  "Serviço atualizado.",
]);

export function AdminAppointmentPage() {
  const { id } = useParams();
  const [a, setA] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const minDateTimeLocal = useMinDatetimeLocal(30000);

  const reload = useCallback(async () => {
    if (!id) return;
    const list = await apiFetch<{ appointments: Appointment[] }>("/admin/appointments");
    const found = list.appointments.find((x) => x.id === id) ?? null;
    setA(found);
    if (found) {
      const d = new Date(found.startAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setStartAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
      setStatus(found.status);
      setNotes(found.notes ?? "");
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (error) return <p className="error">{error}</p>;
  if (loading) {
    return (
      <div className="card">
        <Spinner />
      </div>
    );
  }
  if (!a) {
    return (
      <div className="card">
        <p className="error">Agendamento não encontrado.</p>
      </div>
    );
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const current = a;
    if (!current) return;
    if (!isDatetimeLocalStrictlyInFuture(startAt)) {
      setMsg("Escolha data e hora posteriores ao momento atual.");
      return;
    }
    try {
      const iso = new Date(startAt).toISOString();
      await apiFetch(`/admin/appointments/${current.id}`, {
        method: "PATCH",
        json: { startAt: iso, status, notes },
      });
      await reload();
      setMsg("Dados salvos.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
    }
  }

  async function confirm() {
    setMsg(null);
    const current = a;
    if (!current) return;
    try {
      await apiFetch(`/admin/appointments/${current.id}/confirm`, { method: "POST", json: {} });
      await reload();
      setMsg("Agendamento confirmado.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
    }
  }

  async function updateLine(lineId: string, operationalStatus: string) {
    setMsg(null);
    const current = a;
    if (!current) return;
    try {
      await apiFetch(`/admin/appointments/${current.id}/services/${lineId}`, {
        method: "PATCH",
        json: { operationalStatus },
      });
      await reload();
      setMsg("Serviço atualizado.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="card">
      <h2>Gerenciar agendamento</h2>
      <p>
        <strong>Cliente:</strong> {a.customer.name} ({a.customer.email})
      </p>
      <form onSubmit={saveMeta}>
        <label htmlFor="startAt">Data e hora</label>
        <input
          id="startAt"
          type="datetime-local"
          value={startAt}
          min={minDateTimeLocal}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <label htmlFor="status">Estado do agendamento</label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {appointmentStatusLabel[s]}
            </option>
          ))}
        </select>
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit">Salvar</button>
          <button type="button" className="secondary" onClick={confirm}>
            Confirmar agendamento
          </button>
        </div>
      </form>

      <h3>Serviços</h3>
      <table>
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Estado operacional</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {a.lines.map((l) => (
            <tr key={l.id}>
              <td>{l.service.name}</td>
              <td>
                <Badge value={l.operationalStatus} />
              </td>
              <td>
                <select
                  defaultValue={l.operationalStatus}
                  onChange={(e) => updateLine(l.id, e.target.value)}
                >
                  {opStatuses.map((s) => (
                    <option key={s} value={s}>
                      {operationalStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {msg ? <p className={MENSAGENS_SUCESSO.has(msg) ? "success" : "error"}>{msg}</p> : null}
    </div>
  );
}
