import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

type WeeklyReport = {
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

function getCurrentWeek(): { year: number; week: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
  );
  return { year: now.getFullYear(), week };
}

function prevWeek(year: number, week: number) {
  if (week === 1) return { year: year - 1, week: 52 };
  return { year, week: week - 1 };
}

function nextWeek(year: number, week: number) {
  if (week === 52) return { year: year + 1, week: 1 };
  return { year, week: week + 1 };
}

const current = getCurrentWeek();

export function AdminReportPage() {
  const [year, setYear] = useState(current.year);
  const [week, setWeek] = useState(current.week);
  const [data, setData] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(y: number, w: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<WeeklyReport>(
        `/reports/weekly?year=${y}&week=${w}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(year, week);
  }, [year, week]);

  const isCurrentWeek = year === current.year && week === current.week;

  function handlePrev() {
    const p = prevWeek(year, week);
    setYear(p.year);
    setWeek(p.week);
  }

  function handleNext() {
    const n = nextWeek(year, week);
    setYear(n.year);
    setWeek(n.week);
  }

  const dateRange = data
    ? `${new Date(data.week.start).toLocaleDateString("pt-BR")} – ${new Date(data.week.end).toLocaleDateString("pt-BR")}`
    : null;

  return (
    <div className="card">
      <h2>Desempenho por semana</h2>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div className="row" style={{ gap: "0.5rem" }}>
          <button className="secondary" onClick={handlePrev} aria-label="Semana anterior">
            ←
          </button>
          <span style={{ fontWeight: 600, minWidth: 160, textAlign: "center" }}>
            Semana {week} · {year}
          </span>
          <button
            className="secondary"
            onClick={handleNext}
            disabled={isCurrentWeek}
            aria-label="Próxima semana"
          >
            →
          </button>
        </div>
        <button onClick={() => loadData(year, week)} disabled={loading}>
          {loading ? "Carregando…" : "Carregar"}
        </button>
      </div>

      {dateRange && (
        <p className="text-muted" style={{ marginTop: 0 }}>
          {dateRange}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {loading && <p className="spinner">Carregando…</p>}

      {!loading && data && (
        <>
          <div className="row" style={{ gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="card" style={{ flex: 1, margin: 0, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                {data.totals.appointments}
              </div>
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                Total de agendamentos
              </div>
            </div>
            <div className="card" style={{ flex: 1, margin: 0, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#15803d" }}>
                {data.totals.byStatus.confirmed}
              </div>
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                Confirmados
              </div>
            </div>
            <div className="card" style={{ flex: 1, margin: 0, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1d4ed8" }}>
                {data.totals.byStatus.pending_confirmation}
              </div>
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                Pendentes
              </div>
            </div>
            <div className="card" style={{ flex: 1, margin: 0, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#b91c1c" }}>
                {data.totals.byStatus.cancelled}
              </div>
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                Cancelados
              </div>
            </div>
          </div>

          {data.topServices.length > 0 && (
            <>
              <h3 style={{ marginBottom: "0.5rem" }}>Serviços mais solicitados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th style={{ width: 80, textAlign: "right" }}>Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topServices.map((s) => (
                    <tr key={s.serviceId}>
                      <td>{s.name}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {data.topServices.length === 0 && (
            <p className="text-muted">Nenhum serviço registrado nesta semana.</p>
          )}
        </>
      )}

      {!loading && !data && !error && (
        <p className="text-muted">Selecione uma semana para ver o desempenho.</p>
      )}
    </div>
  );
}
