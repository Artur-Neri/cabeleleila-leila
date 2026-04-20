# Coisas opcionais (referência)

Isso não é necessário para **subir o projeto**; serve para você entender o que pode mudar ou usar quando precisar.

## Variáveis de ambiente (`.env` na API)

Arquivo de exemplo: [.env.example](../.env.example).

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão com o Postgres. Obrigatória em desenvolvimento local; no Docker o Compose já injeta o valor certo no serviço `api`. |
| `JWT_SECRET` | Segredo para assinar tokens JWT. Em desenvolvimento você pode manter o valor do exemplo; em produção **precisa** ser longo, aleatório e privado. No Compose você pode definir `JWT_SECRET` no ambiente; se não definir, a API usa um valor de desenvolvimento **padrão**. |
| `PORT` / `HOST` | Porta e interface em que a API escuta. Os valores **padrão** são `3001` e `0.0.0.0`. |
| `VITE_API_BASE` | Só importa no **build de produção** do front-end (URL base da API). Em `npm run dev` o Vite usa o proxy (veja abaixo). |

## Docker: migrate e seed ao iniciar

No `docker/api.Dockerfile`, o comando de inicialização executa `prisma migrate deploy`, depois `prisma db seed` e só então o servidor Node. Por isso as contas da tabela do README existem depois do primeiro `docker compose up` bem-sucedido, sem você precisar rodar o Prisma manualmente dentro do container.

## Health check

A rota `GET /health` (e, por trás do Nginx do front-end em produção, também em `/api/health`) serve para verificar se a API está no ar. É útil em **monitoramento** ou em balanceadores de carga; no desenvolvimento do dia a dia você não precisa abrir essa URL.

## Desenvolvimento: proxy do Vite

Com `npm run dev` em `apps/web`, requisições para caminhos que começam com `/api` são enviadas para `http://127.0.0.1:3001`. Assim o navegador fala sempre com o Vite (mesma origem) e o Vite encaminha para a API — isso evita problemas de CORS no dia a dia.

## Rodar só a API ou só o front-end

Na raiz do monorepo:

- `npm run dev:api` — só a API.
- `npm run dev:web` — só o Vite.

Útil quando você está trabalhando só em um dos lados ou quer menos processos ao mesmo tempo.

## Postgres sem Docker

Se você já tem o Postgres instalado (ou na nuvem), não precisa de `docker compose up postgres`: basta uma `DATABASE_URL` correta em `apps/api/.env` e o banco criado/vazio antes das migrations.

## Comandos úteis na raiz

| Comando | Uso típico |
|---------|------------|
| `npm run build` | Gerar artefatos de produção (API compilada + bundle do front-end). |
| `npm run lint` | Verificar estilo e erros com ESLint antes de commitar ou em CI. |
| `npm run test --workspace=api` | Rodar testes unitários da API (Vitest). |
