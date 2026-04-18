import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function CustomerLayout() {
  const { auth, logout } = useAuth();
  if (auth.status !== "authenticated") return null;

  return (
    <div className="layout">
      <header>
        <div>
          <h1>Área do cliente</h1>
          <small className="text-muted">
            Olá, {auth.user.name} ({auth.user.email})
          </small>
        </div>
        <div className="row">
          <NavLink to="/cliente">Novo agendamento</NavLink>
          <NavLink to="/cliente/historico">Histórico</NavLink>
          <button type="button" className="secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
