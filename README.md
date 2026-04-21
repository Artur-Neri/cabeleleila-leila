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
## Demonstração
- Link para o vídeo demonstração: https://drive.google.com/drive/folders/1bvh3LtWfTLKevWUg8UTufiYD_OV602QB?usp=drive_link

### Login
<img width="1809" height="905" alt="image" src="https://github.com/user-attachments/assets/83f67d96-f010-4753-a5db-eec714cd1934" />

### Tela de Agendamento
<img width="1793" height="909" alt="image" src="https://github.com/user-attachments/assets/e52b6695-1447-47a6-ad7f-beb7c18212c8" />

### Confirmação Agendamento
<img width="1809" height="905" alt="image" src="https://github.com/user-attachments/assets/9161708d-edea-4939-95b0-9a46340ea424" />

### Histórico de Agendamentos do Cliente
<img width="1808" height="899" alt="image" src="https://github.com/user-attachments/assets/5928137e-dbde-40fd-95e9-5dfe75a229b4" />

### Lista de Agendamentos - ADM
<img width="1810" height="907" alt="image" src="https://github.com/user-attachments/assets/9046eaee-88c8-4fdf-bdda-6666be98bd3b" />

### Gerenciamento de Agendamento - ADM
<img width="1816" height="906" alt="image" src="https://github.com/user-attachments/assets/188fd240-14b7-481f-9a71-6b796341a600" />

### Relatório - ADM
<img width="1817" height="903" alt="image" src="https://github.com/user-attachments/assets/800a30e4-c36c-41dc-9056-23e46dd75465" />
