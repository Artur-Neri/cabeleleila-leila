# Cabeleleila Leila — agendamentos

Monorepo **Node.js**: API **Fastify** + **Prisma** + **PostgreSQL**, front **React (Vite)**.

## Requisitos

- **Node.js 20+**
- **Docker Desktop** (recomendado para subir tudo de uma vez)

## Opção A — Docker (um comando)

Na raiz do projeto:

```bash
docker compose up --build
```

Aguarda o Postgres ficar saudável (pode levar 15–60 s na primeira vez).

| O quê | URL |
|--------|-----|
| **Web** | http://localhost:8080 |
| **API** (direto) | http://localhost:3001 |
| **Health** | http://localhost:3001/health ou http://localhost:8080/api/health |

### Contas demo (após o seed)

| Perfil | Email | Palavra-passe |
|--------|--------|----------------|
| Cliente | `cliente@demo.local` | `cliente123` |
| Admin | `admin@demo.local` | `admin123` |

Variável opcional: `JWT_SECRET` (ver [.env.example](.env.example)).

---

## Opção B — Desenvolvimento local (API + Web)

1. **Postgres** a correr (podes usar só o serviço `postgres` do Compose: `docker compose up postgres`).
2. Copia [.env.example](.env.example) para `apps/api/.env` e ajusta `DATABASE_URL` (ex.: `postgresql://cabeleleila:cabeleleila@localhost:5432/cabeleleila?schema=public`).
3. Na raiz:

```bash
npm install
cd apps/api
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

4. Noutro terminal, o front (o Vite faz proxy de `/api` → `http://127.0.0.1:3001`):

```bash
cd apps/web
npm run dev
```

Ou, na raiz, API + Web em paralelo:

```bash
npm run dev
```

- **Web:** http://localhost:5173  
- **API:** http://localhost:3001  

---

## Scripts úteis (na raiz)

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build da API e do Web |
| `npm run lint` | ESLint |
| `npm run test --workspace=api` | Testes unitários da API |

---

## Documentação

- Decisões de arquitetura: [docs/AULA-DECISOES.md](docs/AULA-DECISOES.md)
- Pasta para vídeo/capturas: [demo/](demo/)
