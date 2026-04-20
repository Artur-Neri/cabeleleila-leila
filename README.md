# Cabeleleila Leila

Monorepo npm: API em `apps/api` (Fastify + Prisma), front-end em `apps/web` (React + Vite).

**Requisitos:** Node.js 20+ e Docker Desktop.

---

## Rodar com Docker

Na raiz do repositório:

```bash
docker compose up --build
```

| Item | URL |
|--------|-----|
| Web | http://localhost:8080 |
| API | http://localhost:3001 |

Contas de demonstração:

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Cliente | `cliente@demo.local` | `cliente123` |
| Admin | `admin@demo.local` | `admin123` |

---

## Rodar em desenvolvimento

1. Na raiz, execute `docker compose up postgres` (ou use outro Postgres acessível pela variável `DATABASE_URL`).
2. Copie o arquivo [.env.example](.env.example) para `apps/api/.env` e ajuste a `DATABASE_URL`, se necessário.
3. Na raiz, execute `npm install`.
4. Migrações e seed:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

5. Se você ainda estiver em `apps/api`, execute `cd ../..`. Na raiz do repositório, execute `npm run dev`.

| Item | URL |
|--------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3001 |

---

Mais opções, variáveis de ambiente e detalhes técnicos: **[docs/opcional.md](docs/opcional.md)**.
