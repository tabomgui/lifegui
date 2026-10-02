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

### Changed

- **Breaking:** MCP tools were renamed to English: `my_day`, `my_studies`,
  `search_notes`, `capture`, `create_task`, `complete_habit` and `schedule`. Their
  parameters are in English too. MCP answers follow the user's language. Update any
  prompt or skill that mentions the old names.
- New notes created from the default template use the heading "My notes" for English
  users. Existing notes are unchanged.
- Events that lifegui creates in Google Calendar get their description in the user's
  language.

### Fixed

- Weeks always start on Monday, whatever the user's language.

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
