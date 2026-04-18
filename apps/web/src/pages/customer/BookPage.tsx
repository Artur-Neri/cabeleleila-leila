import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Spinner } from "../../components/Spinner";
import { isDatetimeLocalStrictlyInFuture, useMinDatetimeLocal } from "../../utils/datetimeLocal";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export function BookPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [startAt, setStartAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

  const minDateTimeLocal = useMinDatetimeLocal(30000);

  useEffect(() => {
    setLoadingServices(true);
    apiFetch<{ services: Service[] }>("/services")
      .then((r) => setServices(r.services))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoadingServices(false));
  }, []);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const serviceIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (serviceIds.length === 0) {
      setError("Escolha pelo menos um serviço.");
      return;
    }
    if (!startAt) {
      setError("Indique data e hora.");
      return;
    }
    if (!isDatetimeLocalStrictlyInFuture(startAt)) {
      setError("Escolha data e hora posteriores ao momento atual.");
      return;
    }
    const iso = new Date(startAt).toISOString();
    setLoading(true);
    try {
      const res = await apiFetch<{ appointment: { id: string } }>("/appointments", {
        method: "POST",
        json: { serviceIds, startAt: iso, notes: notes || undefined },
      });
      navigate(`/cliente/agendamento/${res.appointment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Novo agendamento</h2>
      <form onSubmit={onSubmit}>
        <label>Serviços</label>
        {loadingServices ? (
          <Spinner label="Carregando serviços…" />
        ) : (
          <div className="checkbox-grid">
            {services.map((s) => (
              <label key={s.id} className="service-option">
                <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} />
                <span>
                  <span className="service-option-title">{s.name}</span>
                  <small className="service-option-meta">
                    {s.durationMinutes} min ·{" "}
                    {(s.priceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </small>
                </span>
              </label>
            ))}
          </div>
        )}
        <label htmlFor="startAt">Data e hora</label>
        <input
          id="startAt"
          type="datetime-local"
          value={startAt}
          min={minDateTimeLocal}
          onChange={(e) => setStartAt(e.target.value)}
          required
        />
        <label htmlFor="notes">Notas (opcional)</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" disabled={loading || loadingServices}>
            {loading ? "Salvando…" : "Agendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
