import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import type { Appointment } from "../../types/api";
import { formatDateTimePtBr } from "../../utils/formatDateTime";

export function HistoryPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString();
        const toIso = new Date(`${to}T23:59:59.999Z`).toISOString();
        const res = await apiFetch<{ appointments: Appointment[] }>(
          `/appointments/history?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
        );
        setItems(res.appointments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro");
        setItems(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    },
    [from, to]
  );

  useEffect(() => {
    void load();
    // Apenas período inicial; filtros seguintes usam o botão "Filtrar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <h2>Histórico</h2>
      <form onSubmit={load} className="row" style={{ marginBottom: "1rem" }}>
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
      {!initialized ? (
        <Spinner />
      ) : error ? null : items && items.length > 0 ? (
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
      ) : (
        <p>Sem agendamentos no período.</p>
      )}
    </div>
  );
}
