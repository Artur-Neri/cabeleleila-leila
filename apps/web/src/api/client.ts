const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown };
};

function getToken(): string | null {
  return localStorage.getItem("cabeleleila_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("cabeleleila_token", token);
  else localStorage.removeItem("cabeleleila_token");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: BodyInit | undefined = init.body ?? undefined;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error("Resposta inesperada do servidor. Tente novamente.");
  }

  if (!res.ok) {
    const err = data as ApiErrorBody;
    const fallback =
      res.status === 401
        ? "Sessão expirada. Faça login novamente."
        : res.status === 403
          ? "Você não tem permissão para realizar esta ação."
          : res.status === 404
            ? "Recurso não encontrado."
            : res.status === 409
              ? "Conflito ao processar a solicitação."
              : res.status >= 500
                ? "Erro interno no servidor. Tente novamente em instantes."
                : "Não foi possível concluir a solicitação.";
    const message = err?.error?.message ?? fallback;
    const e = new Error(message);
    (e as Error & { status: number; body: unknown }).status = res.status;
    (e as Error & { status: number; body: unknown }).body = data;
    throw e;
  }
  return data as T;
}
