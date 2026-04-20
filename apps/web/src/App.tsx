import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Role } from "./context/authTypes";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CustomerLayout } from "./pages/customer/CustomerLayout";
import { BookPage } from "./pages/customer/BookPage";
import { HistoryPage } from "./pages/customer/HistoryPage";
import { CustomerAppointmentPage } from "./pages/customer/CustomerAppointmentPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminListPage } from "./pages/admin/AdminListPage";
import { AdminAppointmentPage } from "./pages/admin/AdminAppointmentPage";
import { AdminReportPage } from "./pages/admin/AdminReportPage";

function RequireAuth({ role, children }: { role: Role; children: ReactElement }) {
  const { auth } = useAuth();
  if (auth.status !== "authenticated") return <Navigate to="/login" replace />;
  if (auth.user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  const { auth } = useAuth();

  return (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route
          path="/cliente"
          element={
            <RequireAuth role="customer">
              <CustomerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<BookPage />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="agendamento/:id" element={<CustomerAppointmentPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminListPage />} />
          <Route path="agendamento/:id" element={<AdminAppointmentPage />} />
          <Route path="relatorio" element={<AdminReportPage />} />
        </Route>
        <Route
          path="/"
          element={
            auth.status === "authenticated" ? (
              <Navigate to={auth.user.role === "admin" ? "/admin" : "/cliente"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
      />
    </Routes>
  );
}
