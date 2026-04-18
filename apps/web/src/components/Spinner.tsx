type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = "Carregando…" }: SpinnerProps) {
  return (
    <p className="spinner" role="status" aria-live="polite">
      {label}
    </p>
  );
}
