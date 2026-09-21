# lifegui — convenções do projeto

App de organização pessoal (tarefas + hábitos), multi-tenant. Frontend React/Vite/Tailwind v4/shadcn; backend Laravel 12 API + MySQL, tudo em Docker.

## UI

- **Sem emoji na interface.** Nunca usar emoji em componentes, labels, toasts, estados
  vazios, seeds ou dados de exemplo. Usar **lucide icons** (`lucide-react`) em todo lugar
  onde hoje se usaria um emoji (ícone de categoria, ícone de hábito, checks, etc.).
- Seguir shadcn/ui estilo **new-york**, base **neutral**; ícones sempre do **lucide**.
- Pickers de ícone devem renderizar o **componente lucide de verdade**, não o nome em texto.

## Estrutura

- Frontend em `frontend/` (alias `@` → `src`), backend em `backend/`.
- Multi-tenancy: todo model de domínio usa o trait `App\Models\Concerns\BelongsToUser`
  (global scope por `auth()->id()` + auto `user_id`); toda rota de recurso fica atrás de
  `auth:sanctum`.
- Regras `exists` de validação que referenciam recursos do usuário devem ser escopadas ao
  `auth()->id()` (ex.: `Rule::exists('categories','id')->where('user_id', $this->user()->id)`).

## Fluxo de trabalho

- Testes backend com Pest; front verificado por `npm run build`.
- Planos/specs de desenvolvimento ficam em `docs/` (ignorado pelo git, local).
