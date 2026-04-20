import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { auth, login } = useAuth();
  const [email, setEmail] = useState("cliente@demo.local");
  const [password, setPassword] = useState("cliente123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (auth.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="card login-card">
        <h1>Cabeleleila Leila</h1>
        <p>Entre para gerenciar seus agendamentos.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="error">{error}</p> : null}
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "1.25rem" }}>
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Contas de demonstração: <code>cliente@demo.local</code> / <code>cliente123</code> ou{" "}
          <code>admin@demo.local</code> / <code>admin123</code>
        </p>
      </div>
    </main>
  );
}
