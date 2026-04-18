import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { Badge } from "../../components/Badge";
import { formatDateTimePtBr } from "../../utils/formatDateTime";

type Appointment = {
  id: string;
  startAt: string;
  status: string;
  customer: { name: string; email: string };
  lines: { service: { name: string } }[];
};

export function AdminListPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ appointments: Appointment[] }>("/admin/appointments")
      .then((r) => setItems(r.appointments))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="card">
      <h2>Todos os agendamentos</h2>
      {items.length === 0 ? (
        <p>Nenhum agendamento encontrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Data</th>
              <th>Estado</th>
              <th>Serviços</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.customer.name}
                  <br />
                  <small>{a.customer.email}</small>
                </td>
                <td>{formatDateTimePtBr(a.startAt)}</td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td>{a.lines.map((l) => l.service.name).join(", ")}</td>
                <td>
                  <Link to={`/admin/agendamento/${a.id}`}>Gerenciar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
