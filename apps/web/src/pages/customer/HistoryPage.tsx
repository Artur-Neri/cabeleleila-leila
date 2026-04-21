import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import type { Appointment } from "../../types/api";
import { formatDateTimePtBr } from "../../utils/formatDateTime";

function initialFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function initialTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HistoryPage() {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  // "Applied" = filtro efetivamente carregado; inicializa igual ao campo.
  // Trocar appliedFrom/To dispara o useEffect abaixo, sem precisar suprimir lint.
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo, setAppliedTo] = useState(initialTo);

  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    const fromIso = new Date(`${appliedFrom}T00:00:00.000Z`).toISOString();
    const toIso = new Date(`${appliedTo}T23:59:59.999Z`).toISOString();
    apiFetch<{ appointments: Appointment[] }>(
      `/appointments/history?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
    )
      .then((res) => { if (!cancelled) setItems(res.appointments); })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Erro"); setItems(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appliedFrom, appliedTo]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  return (
    <div className="card">
      <h2>Histórico</h2>
      <form onSubmit={onSubmit} className="row" style={{ marginBottom: "1rem" }}>
        <div>
          <label htmlFor="from">De</label>
          <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="to">Até</label>
          <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Carregando…" : "Filtrar"}
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {loading ? (
        <Spinner />
      ) : items && items.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Estado</th>
              <th>Serviços</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{formatDateTimePtBr(a.startAt)}</td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td>{a.lines.map((l) => l.service.name).join(", ")}</td>
                <td>
                  <Link className="link-pill" to={`/cliente/agendamento/${a.id}`}>
                    Ver detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : items !== null ? (
        <p>Sem agendamentos no período.</p>
      ) : null}
    </div>
  );
}
