/** Formata instante ISO para exibição em português do Brasil. */
export function formatDateTimePtBr(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
