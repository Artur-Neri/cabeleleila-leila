import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import type { Appointment, Suggestion } from "../../types/api";
import { isDatetimeLocalStrictlyInFuture, useMinDatetimeLocal } from "../../utils/datetimeLocal";
import { formatDateTimePtBr } from "../../utils/formatDateTime";
import { canCustomerReschedule } from "../../utils/policy";

const MSG_SALVO = "Salvo.";

export function CustomerAppointmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ appointment: Appointment; suggestion: Suggestion } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const minDateTimeLocal = useMinDatetimeLocal(30000);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ appointment: Appointment; suggestion: Suggestion }>(`/appointments/${id}`)
      .then((r) => {
        setData(r);
        const d = new Date(r.appointment.startAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setStartAt(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        );
        setNotes(r.appointment.notes ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [id]);

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <p>
          <Link to="/cliente/historico">← Voltar ao histórico</Link>
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <Spinner />
      </div>
    );
  }

  const a = data.appointment;
  const editable = canCustomerReschedule(new Date(a.startAt), new Date());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!isDatetimeLocalStrictlyInFuture(startAt)) {
      setMsg("Escolha data e hora posteriores ao momento atual.");
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(startAt).toISOString();
      const res = await apiFetch<{ appointment: Appointment; suggestion: Suggestion }>(
        `/appointments/${a.id}`,
        { method: "PATCH", json: { startAt: iso, notes } }
      );
      setData(res);
      setMsg(MSG_SALVO);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function mergeIntoFirst() {
    if (!data?.suggestion?.firstAppointmentId || !id) return;
    setMergeError(null);
    setMerging(true);
    try {
      await apiFetch(`/appointments/${id}/merge`, {
        method: "POST",
        json: { targetAppointmentId: data.suggestion.firstAppointmentId },
      });
      navigate(`/cliente/agendamento/${data.suggestion.firstAppointmentId}`);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Erro ao agregar agendamentos");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>
        <Link to="/cliente/historico">← Voltar ao histórico</Link>
      </p>
      <h2>Agendamento</h2>
      <p>
        <strong>Data:</strong> {formatDateTimePtBr(a.startAt)}
      </p>
      <p>
        <strong>Estado:</strong> <Badge value={a.status} />
      </p>
      <p>
        <strong>Serviços:</strong>
      </p>
      <ul>
        {a.lines.map((l) => (
          <li key={l.id}>
            {l.service.name} — <Badge value={l.operationalStatus} />
          </li>
        ))}
      </ul>

      {data.suggestion ? (
        <div className="card" style={{ background: "#fff7ed", borderLeft: "4px solid #f97316" }}>
          <strong>Sugestão</strong>
          <p>{data.suggestion.message}</p>
          <p>
            <small>Sugerido: {formatDateTimePtBr(data.suggestion.suggestedStartAt)}</small>
          </p>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            Clique abaixo para unir os serviços dos dois agendamentos em um só, eliminando
            duplicatas.
          </p>
          <button
            type="button"
            onClick={mergeIntoFirst}
            disabled={merging}
            style={{ background: "#f97316", color: "#fff", border: "none" }}
          >
            {merging ? "Agregando…" : "Agregar agendamentos"}
          </button>
          {mergeError ? <p className="error">{mergeError}</p> : null}
        </div>
      ) : null}

      {!editable ? (
        <p className="info">
          Não é possível alterar este agendamento com menos de 2 dias de antecedência. Para alterar,
          entre em contato com o salão por telefone.
        </p>
      ) : (
        <form onSubmit={save}>
          <label htmlFor="startAt">Nova data e hora</label>
          <input
            id="startAt"
            type="datetime-local"
            value={startAt}
            min={minDateTimeLocal}
            onChange={(e) => setStartAt(e.target.value)}
          />
          <label htmlFor="notes">Notas</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      )}
      {msg ? (
        <p className={msg === MSG_SALVO ? "success" : "error"}>{msg}</p>
      ) : null}
    </div>
  );
}
