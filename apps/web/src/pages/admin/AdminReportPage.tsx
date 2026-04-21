import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { Spinner } from "../../components/Spinner";
import type { WeeklyReport } from "../../types/admin";
import { currentIsoWeek, nextWeek, prevWeek } from "../../utils/isoWeek";

const current = currentIsoWeek();

export function AdminReportPage() {
  const [year, setYear] = useState(current.year);
  const [week, setWeek] = useState(current.week);
  const [data, setData] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<WeeklyReport>(`/reports/weekly?year=${year}&week=${week}`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  const maxServiceCount = data?.topServices[0]?.count ?? 1;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Desempenho por semana</h2>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <div className="row" style={{ gap: "0.5rem" }}>
          <button
            type="button"
            className="secondary"
            onClick={handlePrev}
            aria-label="Semana anterior"
            style={{ padding: "0.45rem 0.75rem" }}
          >
            ←
          </button>
          <span style={{ fontWeight: 600, minWidth: 160, textAlign: "center" }}>
            Semana {week} · {year}
          </span>
          <button
            type="button"
            className="secondary"
            onClick={handleNext}
            disabled={isCurrentWeek}
            aria-label="Próxima semana"
            style={{ padding: "0.45rem 0.75rem" }}
          >
            →
          </button>
        </div>
        {isCurrentWeek && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              background: "#dcfce7",
              color: "#15803d",
              borderRadius: "999px",
              padding: "0.2rem 0.6rem",
              alignSelf: "center",
            }}
          >
            Semana atual
          </span>
        )}
      </div>

      {dateRange && (
        <p className="text-muted" style={{ margin: "0 0 1.25rem", fontSize: "0.85rem" }}>
          {dateRange}
        </p>
      )}

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <Spinner label="Carregando…" />
      ) : data ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <StatCard label="Total" value={data.totals.appointments} />
            <StatCard
              label="Confirmados"
              value={data.totals.byStatus.confirmed}
              color="#15803d"
            />
            <StatCard
              label="Pendentes"
              value={data.totals.byStatus.pending_confirmation}
              color="#1d4ed8"
            />
            <StatCard
              label="Cancelados"
              value={data.totals.byStatus.cancelled}
              color="#b91c1c"
            />
          </div>

          {data.topServices.length > 0 ? (
            <>
              <h3 style={{ margin: "0 0 0.75rem" }}>Serviços mais solicitados</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {data.topServices.map((s) => (
                  <div key={s.serviceId}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <span>{s.name}</span>
                      <span style={{ fontWeight: 700 }}>{s.count}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(s.count / maxServiceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted">Nenhum serviço registrado nesta semana.</p>
          )}
        </>
      ) : !error ? (
        <p className="text-muted">Selecione uma semana para ver o desempenho.</p>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#fafaf9",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "0.85rem 1rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: color ?? "#1a1a1a" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#57534e", marginTop: "0.15rem" }}>{label}</div>
    </div>
  );
}
