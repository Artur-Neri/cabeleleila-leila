import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Spinner } from "../../components/Spinner";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

function localTodayDateStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Início e fim do expediente (9h–18h) no fuso local do navegador, para um dia YYYY-MM-DD. */
function workBoundsForLocalDate(dateStr: string): { workStart: string; workEnd: string } {
  const [y, M, d] = dateStr.split("-").map(Number);
  const start = new Date(y, M - 1, d, 9, 0, 0, 0);
  const end = new Date(y, M - 1, d, 18, 0, 0, 0);
  return { workStart: start.toISOString(), workEnd: end.toISOString() };
}

function formatSlotLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function BookPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotDuration, setSlotDuration] = useState<number | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const minDay = useMemo(() => localTodayDateStr(), []);

  const selectedServiceIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  const loadSlots = useCallback(async () => {
    setError(null);
    setSlots([]);
    setSlotDuration(null);
    setSelectedSlotIso(null);
    if (!day || selectedServiceIds.length === 0) return;

    const { workStart, workEnd } = workBoundsForLocalDate(day);
    setLoadingSlots(true);
    try {
      const qs = new URLSearchParams({
        workStart,
        workEnd,
        serviceIds: selectedServiceIds.join(","),
      });
      const res = await apiFetch<{ slots: string[]; durationMinutes: number }>(
        `/appointments/availability?${qs.toString()}`
      );
      setSlots(res.slots);
      setSlotDuration(res.durationMinutes);
      if (res.slots.length === 0) {
        setError("Não há horários livres neste dia para os serviços escolhidos. Tente outro dia.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar horários");
    } finally {
      setLoadingSlots(false);
    }
  }, [day, selectedServiceIds]);

  useEffect(() => {
    setLoadingServices(true);
    apiFetch<{ services: Service[] }>("/services")
      .then((r) => setServices(r.services))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedServiceIds.length === 0) {
      setError("Escolha pelo menos um serviço.");
      return;
    }
    if (!day) {
      setError("Escolha o dia.");
      return;
    }
    if (!selectedSlotIso) {
      setError("Escolha um horário disponível.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ appointment: { id: string } }>("/appointments", {
        method: "POST",
        json: { serviceIds: selectedServiceIds, startAt: selectedSlotIso, notes: notes || undefined },
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

        <label htmlFor="day">Dia</label>
        <input
          id="day"
          type="date"
          min={minDay}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required
        />

        <label>Horário</label>
        {!day || selectedServiceIds.length === 0 ? (
          <p className="text-muted" style={{ marginTop: "0.35rem" }}>
            Escolha o dia e pelo menos um serviço para ver os horários livres.
          </p>
        ) : loadingSlots ? (
          <Spinner label="Carregando horários…" />
        ) : slots.length > 0 ? (
          <>
            {slotDuration != null ? (
              <p className="text-muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
                Expediente 9h–18h · duração total {slotDuration} min · intervalos de 15 min. Um horário
                some da lista depois de reservado por alguém.
              </p>
            ) : null}
            <div className="slot-grid" role="listbox" aria-label="Horários disponíveis">
              {slots.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  role="option"
                  aria-selected={selectedSlotIso === iso}
                  className={`slot-btn${selectedSlotIso === iso ? " slot-btn-selected" : ""}`}
                  onClick={() => setSelectedSlotIso(iso)}
                >
                  {formatSlotLabel(iso)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted">Nenhum horário livre neste dia.</p>
        )}

        <label htmlFor="notes">Notas (opcional)</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" disabled={loading || loadingServices || loadingSlots}>
            {loading ? "Salvando…" : "Agendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
