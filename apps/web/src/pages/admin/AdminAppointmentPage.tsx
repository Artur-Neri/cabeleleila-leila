import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import { isDatetimeLocalStrictlyInFuture, useMinDatetimeLocal } from "../../utils/datetimeLocal";
import { formatDateTimePtBr } from "../../utils/formatDateTime";
import { appointmentStatusLabel, operationalStatusLabel } from "../../utils/statusLabels";
import type { AdminAppointment } from "../../types/admin";

const statuses = ["pending_confirmation", "confirmed", "cancelled"] as const;
const opStatuses = ["pending", "in_progress", "completed"] as const;

export function AdminAppointmentPage() {
  const { id } = useParams();
  const [a, setA] = useState<AdminAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingLine, setUpdatingLine] = useState<string | null>(null);
  const minDateTimeLocal = useMinDatetimeLocal(30000);

  const reload = useCallback(async () => {
    if (!id) return;
    const res = await apiFetch<{ appointment: AdminAppointment }>(`/admin/appointments/${id}`);
    setA(res.appointment);
    const d = new Date(res.appointment.startAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    setStartAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
    setStatus(res.appointment.status);
    setNotes(res.appointment.notes ?? "");
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <p><Link to="/admin">← Voltar à lista</Link></p>
      </div>
    );
  }

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
        <p><Link to="/admin">← Voltar à lista</Link></p>
      </div>
    );
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const current = a;
    if (!current) return;
    if (!isDatetimeLocalStrictlyInFuture(startAt)) {
      setMsg({ text: "Escolha data e hora posteriores ao momento atual.", ok: false });
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(startAt).toISOString();
      await apiFetch(`/admin/appointments/${current.id}`, {
        method: "PATCH",
        json: { startAt: iso, status, notes },
      });
      await reload();
      setMsg({ text: "Dados salvos.", ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Erro", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function updateLine(lineId: string, operationalStatus: string) {
    setMsg(null);
    const current = a;
    if (!current) return;
    setUpdatingLine(lineId);
    try {
      await apiFetch(`/admin/appointments/${current.id}/services/${lineId}`, {
        method: "PATCH",
        json: { operationalStatus },
      });
      await reload();
      setMsg({ text: "Serviço atualizado.", ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Erro", ok: false });
    } finally {
      setUpdatingLine(null);
    }
  }

  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>
        <Link to="/admin">← Voltar à lista</Link>
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Gerenciar agendamento</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#57534e" }}>
            {a.customer.name}{" "}
            <span style={{ fontWeight: 400, fontSize: "0.9rem" }}>({a.customer.email})</span>
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <Badge value={a.status} />
          <div style={{ fontSize: "0.8rem", color: "#57534e", marginTop: "0.25rem" }}>
            {formatDateTimePtBr(a.startAt)}
          </div>
        </div>
      </div>

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
          <button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {msg ? (
          <p style={{ marginBottom: 0 }} className={msg.ok ? "success" : "error"}>
            {msg.text}
          </p>
        ) : null}
      </form>

      <h3 style={{ marginTop: "1.5rem" }}>Serviços</h3>
      <table>
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Estado atual</th>
            <th>Alterar</th>
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
                  disabled={updatingLine === l.id}
                  onChange={(e) => updateLine(l.id, e.target.value)}
                  style={{ width: "auto" }}
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
    </div>
  );
}
