# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **English interface.** Each user picks English or Português (Brasil) in Settings or in
  the first-run wizard. New accounts start in the browser language; existing accounts
  stay in Portuguese.
- API errors, validation messages and the MCP authorization page follow the user's
  language.
- Link to the documentation site in the sidebar.
- `PATCH /api/me` to change the signed-in user's language; `GET /api/me` now also
  returns the user's `locale`.
- **Per-user timezone.** Users have a `timezone`, synced from the browser through
  `PATCH /api/me` and returned by `GET /api/me`. Existing accounts start in
  `America/Sao_Paulo`. The server uses it for "today" in streaks, MCP tools and note
  dates, and the MCP server instructions name it instead of a fixed zone.

### Changed

- **Breaking:** MCP tools were renamed to English, and because of this breaking change
  the next release is a major version (`2.0.0`):

  | Old name          | New name       |
  | ----------------- | -------------- |
  | `meu_dia`         | `my_day`       |
  | `meus_estudos`    | `my_studies`   |
  | `buscar_notas`    | `search_notes` |
  | `capturar`        | `capture`      |
  | `criar_tarefa`    | `create_task`  |
  | `concluir_habito` | `complete_habit` |
  | `agendar`         | `schedule`     |

  Their parameters are in English too. MCP answers follow the user's language. Update
  any prompt or skill that mentions the old names.
- New notes created from the default template use the heading "My notes" for English
  users. Existing notes are unchanged.
- Events that lifegui creates in Google Calendar get their description in the user's
  language.
- **Breaking:** the Brain vaults root can no longer be changed in Settings. It comes only
  from `VAULTS_PATH` in `backend/.env` (default `/vaults`), and `PATCH /api/settings/vault`
  is gone. If you had saved a custom root in Settings, set it as `VAULTS_PATH` before you
  upgrade: the migration drops the `app_settings` table.
- **Breaking:** note templates are matched only by category name: a note in category `X`
  uses `Templates/X.md` from the vault, otherwise the default template. The built-in
  aliases (`Receitas` to `Receita`, `Calistenia` to `Exercicio`, `Bateria` to
  `Aula-Bateria`) are gone; rename those template files to keep using them.
- One streak rule everywhere (habits page, habits dashboard, `complete_habit`,
  `my_studies`): a done day counts, a skipped day neither counts nor breaks, a missed day
  breaks, and today never breaks the streak. Perfect days still need every daily habit
  done, so a skipped day breaks the perfect-day streak.

### Fixed

- Weeks always start on Monday, whatever the user's language.
- **Security:** any signed-in user could change the vaults root for the whole instance.
- After 21:00 in São Paulo, the "Schedule" dialog suggested the next day, and server-side
  dates (streak, `complete_habit`, note and capture dates) already used the next day.
- Unchecking a habit today no longer resets its streak to zero.

## [1.0.0] - 2026-10-01

First stable release.

### Added

- **Tasks:** kanban board with drag and drop, categories with icon picker and
  reorderable tabs, brain dump that turns free text into tasks, subtasks, due dates
  with urgency badges, priority flag, "Hoje" view, search, undo delete and keyboard
  shortcuts.
- **Habits:** weekly view with daily check-in, skip state, streaks, progress ring,
  quick add and archive.
- **Dashboards:** one glance page per area (habits, tasks, brain) with task and habit
  heatmaps and a habit adherence radar.
- **Brain:** Obsidian-compatible vault per user, with categories, note templates,
  search, editable tags, a rich markdown editor, wikilinks with backlinks and a graph
  view, a capture inbox (also reachable from an iOS Shortcut through scoped capture
  tokens), and links between notes and tasks or habits.
- **Calendar:** Google Calendar integration without a local mirror. Week, month and day
  views, drag and drop, schedule tasks, habits and notes (including weekly recurrence),
  and edit a single occurrence or the whole series.
- **MCP server:** `/mcp` endpoint with OAuth (dynamic client registration) and seven
  tools: `meu_dia`, `meus_estudos`, `buscar_notas`, `capturar`, `criar_tarefa`,
  `concluir_habito` and `agendar`.
- **Accounts:** email and password sign-in, Google sign-in, per-user modules that can be
  turned on and off in Settings, and multi-tenant data isolation.
- **Instance setup:** one-command installer (`install.sh`), first-account setup screen,
  public sign-up closed by default (`REGISTRATION_ENABLED`), and a first-run onboarding
  wizard that can be replayed from Settings.
- **Deploy:** production Docker Compose stack (MySQL, Laravel API, nginx serving the SPA)
  with health checks, ready to run behind a reverse proxy or Cloudflare Tunnel.
- **UI:** light and dark themes, mobile layout with drawer navigation and swipeable
  kanban columns, and lucide icons throughout.

[1.0.0]: https://github.com/tabomgui/lifegui/releases/tag/v1.0.0
