import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AdminLayout() {
  const { auth, logout } = useAuth();
  if (auth.status !== "authenticated") return null;

  return (
    <div className="layout">
      <header>
        <div>
          <h1>Administração — Leila</h1>
          <small className="text-muted">{auth.user.email}</small>
        </div>
        <div className="row">
          <NavLink to="/admin">Agendamentos</NavLink>
          <NavLink to="/admin/relatorio">Relatório por semana</NavLink>
          <button type="button" className="secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
