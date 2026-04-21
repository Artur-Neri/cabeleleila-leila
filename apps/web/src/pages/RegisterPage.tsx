import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { auth, register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  if (auth.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailAlreadyRegistered(false);
    setLoading(true);
    try {
      await register({ name, phone, email, password });
    } catch (err) {
      const e = err as Error & { code?: string };
      setEmailAlreadyRegistered(e.code === "EMAIL_IN_USE");
      setError(e.message || "Não foi possível criar a conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="card login-card">
        <h1>Criar conta</h1>
        <p>Cadastro simples — você entra logo após salvar.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="reg-name">Nome</label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="reg-phone">Telefone</label>
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            placeholder="11999998888"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            minLength={10}
            maxLength={20}
          />
          <label htmlFor="reg-email">E-mail</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="reg-password">Senha</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error ? <p className="error">{error}</p> : null}
          {emailAlreadyRegistered ? (
            <p className="text-muted" style={{ fontSize: "0.9rem", marginTop: "0.35rem" }}>
              <Link to="/login">Ir para a página de login</Link>
            </p>
          ) : null}
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Criando…" : "Cadastrar"}
            </button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "1.25rem" }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
