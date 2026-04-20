import { useEffect, useState } from "react";

/** Valor para atributo `min`/`value` de `<input type="datetime-local">` no fuso local. */
export function toDatetimeLocalString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `true` se a string do `datetime-local` (interpretada em horário local) for estritamente no futuro. */
export function isDatetimeLocalStrictlyInFuture(value: string): boolean {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
}

/** Mantém o mínimo permitido atualizado (ex.: usuário deixa o formulário aberto). */
export function useMinDatetimeLocal(refreshMs = 30000): string {
  const [v, setV] = useState(() => toDatetimeLocalString(new Date()));
  useEffect(() => {
    const tick = () => setV(toDatetimeLocalString(new Date()));
    const id = setInterval(tick, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);
  return v;
}
