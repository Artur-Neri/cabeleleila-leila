const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown } | string;
  message?: string;
  code?: string;
  statusCode?: number;
};

/** Extrai mensagem/código de vários formatos comuns (Fastify, proxies, gateways). */
function extractApiErrorPayload(data: unknown): { message?: string; code?: string } {
  if (data == null || typeof data !== "object") return {};
  const o = data as Record<string, unknown>;

  const nested = o.error;
  if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
    const e = nested as Record<string, unknown>;
    const msg = typeof e.message === "string" ? e.message : undefined;
    const code = typeof e.code === "string" ? e.code : undefined;
    if (msg !== undefined || code !== undefined) return { message: msg, code };
  }
  if (typeof nested === "string" && nested.length > 0) {
    return { code: nested };
  }

  if (typeof o.message === "string") {
    return {
      message: o.message,
      code: typeof o.code === "string" ? o.code : undefined,
    };
  }
  if (typeof o.code === "string") {
    return { code: o.code };
  }
  return {};
}

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
    const extracted = extractApiErrorPayload(data);
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

    let message = extracted.message ?? fallback;
    let code = extracted.code;

    if (res.status === 409) {
      if (code === "EMAIL_IN_USE" && !extracted.message) {
        message =
          "Já existe um cadastro com este e-mail. Use outro e-mail ou faça login se esta conta for sua.";
      } else if (!extracted.message && !code) {
        message =
          "Não foi possível concluir: os dados entram em conflito (por exemplo, e-mail já cadastrado). Tente outro e-mail ou faça login.";
      }
      /** Cadastro: se o proxy não repassar o JSON de erro, ainda marcamos o código para a UI. */
      if (!code && path === "/auth/register") {
        code = "EMAIL_IN_USE";
      }
    }
    const e = new Error(message) as Error & {
      status: number;
      body: unknown;
      code?: string;
    };
    e.status = res.status;
    e.body = data;
    if (code) e.code = code;
    throw e;
  }
  return data as T;
}
