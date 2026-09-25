# lifegui

App de organização pessoal, self-hosted: tarefas, hábitos, uma base de conhecimento em cima de um vault Obsidian e agenda integrada ao Google Calendar — tudo num lugar só, com dashboards e um servidor MCP pra conversar com o sistema por IA.

## Módulos

- **Tarefas** — kanban por categoria, prazos, recorrência, reordenação por drag and drop.
- **Hábitos** — metas semanais, registro diário, sequências (streaks) e consistência.
- **Cérebro** — notas Markdown direto num vault Obsidian no servidor (o vault é a fonte da verdade; o app só lê e escreve `.md` com frontmatter YAML). Inbox de captura rápida, promoção de captura a nota, tags, wikilinks, backlinks, visão de grafo, editor WYSIWYG (Milkdown/Crepe) com saída de texto puro.
- **Agenda** — Google Calendar como fonte da verdade (sem espelho no banco): eventos criados a partir de tarefas, hábitos e notas via `extendedProperties`, edição de ocorrência única ou da série toda, FullCalendar no front.
- **Dashboards** — um dash por área (hábitos, tarefas, cérebro) com heatmaps, radar de aderência, fluxo semanal e funil de estudo.
- **MCP** — servidor [Model Context Protocol](https://modelcontextprotocol.io) em `/mcp` (OAuth 2.1 + dynamic client registration via Passport) com ferramentas de alto nível: "o que tenho que fazer hoje", "como estão meus estudos", capturar no inbox, criar tarefa, concluir hábito, agendar. Funciona com claude.ai (web/mobile), Claude Code e ChatGPT.

Módulos são ativáveis por usuário nas configurações; a navegação se adapta.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Laravel 12 (PHP 8.3), MySQL 8, Sanctum (SPA) + Passport (MCP), laravel/mcp, Pest |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (new-york), TanStack Query, FullCalendar v6, Milkdown, lucide-react |
| Infra | Docker Compose (dev e prod), nginx servindo o build + proxy pra API |

Multi-tenant por design: todo model de domínio usa um global scope por `user_id`, e cada usuário tem seu próprio vault em `VAULTS_PATH/{user_id}`.

## Rodando local

Pré-requisitos: Docker + Docker Compose.

```bash
git clone https://github.com/tabomgui/lifegui.git
cd lifegui
cp backend/.env.example backend/.env
docker compose up
```

- Frontend: http://localhost:5173
- API: http://localhost:8000

O container do backend instala dependências, gera `APP_KEY` e roda as migrations sozinho. O módulo Cérebro é zero touch: o botão "Ativar Cérebro" na própria UI cria o vault do usuário no servidor.

Integração com Google Calendar e o servidor MCP exigem credenciais próprias (Google Cloud OAuth client e chaves do Passport) — veja `backend/.env.example`.

## Testes

```bash
# Backend (Pest)
cd backend && php artisan test

# Frontend (typecheck + build)
cd frontend && npm run build
```

## Produção

`docker-compose.prod.yml`: MySQL + backend (artisan serve atrás do nginx) + web (nginx com o build do Vite, proxy pra `/api`, `/mcp`, `/oauth` e `/.well-known`). Migrations rodam na subida do container. Chaves OAuth do Passport ficam num volume (`oauth-keys/`), nunca no repo.

## Estrutura

```
backend/    Laravel API (app/Support concentra a lógica de domínio: Calendar, Vault, Reports)
frontend/   SPA React (src/pages, src/components por módulo, src/hooks com TanStack Query)
vaults/     Vaults Obsidian locais (ignorado pelo git — conteúdo pessoal)
```
