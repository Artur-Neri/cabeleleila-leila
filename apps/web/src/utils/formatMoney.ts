/** Formata centavos em reais (ex.: R$ 35,00) para exibição em pt-BR. */
export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
