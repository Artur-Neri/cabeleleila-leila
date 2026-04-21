import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Spinner } from "../../components/Spinner";
import type { Service, Suggestion } from "../../types/api";
import { formatDateTimePtBr } from "../../utils/formatDateTime";
import { formatBrlFromCents } from "../../utils/formatMoney";

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

type MergeModalProps = {
  suggestion: NonNullable<Suggestion>;
  newAppointmentId: string;
  onMerge: () => Promise<void>;
  onSkip: () => void;
  merging: boolean;
  mergeError: string | null;
};

function MergeModal({ suggestion, newAppointmentId: _newAppointmentId, onMerge, onSkip, merging, mergeError }: MergeModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.25rem",
      }}
    >
      <div
        className="card"
        style={{ maxWidth: 440, width: "100%", margin: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
      >
        <p style={{ margin: "0 0 0.25rem", fontSize: "1.25rem" }}>🗓️</p>
        <h3 id="merge-modal-title" style={{ marginTop: 0 }}>
          Você já tem visita nesta semana
        </h3>
        <p style={{ color: "#57534e" }}>{suggestion.message}</p>
        <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#57534e" }}>
          Sugerimos mover este agendamento para{" "}
          <strong>{formatDateTimePtBr(suggestion.suggestedStartAt)}</strong>, unindo tudo no mesmo dia.
        </p>
        {mergeError ? <p className="error">{mergeError}</p> : null}
        <div className="row">
          <button type="button" onClick={onMerge} disabled={merging}>
            {merging ? "Agregando…" : "Unir no mesmo dia"}
          </button>
          <button type="button" className="secondary" onClick={onSkip} disabled={merging}>
            Manter separado
          </button>
        </div>
      </div>
    </div>
  );
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

  // Preview de merge (pré-submit)
  const [preview, setPreview] = useState<Suggestion>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal pós-criação
  const [mergeModal, setMergeModal] = useState<{
    suggestion: NonNullable<Suggestion>;
    newAppointmentId: string;
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

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

  // Debounce do preview de merge: dispara 400ms após escolher um horário
  useEffect(() => {
    setPreview(null);
    if (!selectedSlotIso) return;

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ proposedStartAt: selectedSlotIso });
        const res = await apiFetch<{ suggestion: Suggestion }>(
          `/appointments/merge-preview?${qs.toString()}`
        );
        setPreview(res.suggestion);
      } catch {
        // preview é best-effort; não bloqueia o fluxo
      }
    }, 400);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [selectedSlotIso]);

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
      const res = await apiFetch<{ appointment: { id: string }; suggestion: Suggestion }>(
        "/appointments",
        {
          method: "POST",
          json: { serviceIds: selectedServiceIds, startAt: selectedSlotIso, notes: notes || undefined },
        }
      );

      if (res.suggestion) {
        setMergeModal({ suggestion: res.suggestion, newAppointmentId: res.appointment.id });
      } else {
        navigate(`/cliente/agendamento/${res.appointment.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!mergeModal) return;
    setMergeError(null);
    setMerging(true);
    try {
      await apiFetch(`/appointments/${mergeModal.newAppointmentId}/merge`, {
        method: "POST",
        json: { targetAppointmentId: mergeModal.suggestion.firstAppointmentId },
      });
      navigate(`/cliente/agendamento/${mergeModal.suggestion.firstAppointmentId}`);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Erro ao agregar agendamentos");
    } finally {
      setMerging(false);
    }
  }

  function handleSkipMerge() {
    if (!mergeModal) return;
    navigate(`/cliente/agendamento/${mergeModal.newAppointmentId}`);
  }

  return (
    <>
      {mergeModal ? (
        <MergeModal
          suggestion={mergeModal.suggestion}
          newAppointmentId={mergeModal.newAppointmentId}
          onMerge={handleMerge}
          onSkip={handleSkipMerge}
          merging={merging}
          mergeError={mergeError}
        />
      ) : null}

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
                      {formatBrlFromCents(s.priceCents)}
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
                  Duração total {slotDuration} min.
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

          {preview ? (
            <p
              className="info"
              style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}
            >
              <span>📌</span>
              <span>
                Você já tem visita nesta semana —{" "}
                <strong>ao confirmar</strong>, você poderá unir tudo no mesmo dia (
                {formatDateTimePtBr(preview.suggestedStartAt)}).
              </span>
            </p>
          ) : null}

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
    </>
  );
}
