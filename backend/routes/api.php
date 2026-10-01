<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SetupController;
use App\Http\Controllers\Brain\CategoryController as BrainCategoryController;
use App\Http\Controllers\Brain\GraphController as BrainGraphController;
use App\Http\Controllers\Brain\InboxController as BrainInboxController;
use App\Http\Controllers\Brain\LinkController as BrainLinkController;
use App\Http\Controllers\Brain\NoteController as BrainNoteController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\HabitController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TokenController;
use App\Http\Middleware\RestrictCaptureTokens;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Primeira conta da instância (só funciona com a tabela users vazia).
Route::get('/setup/status', [SetupController::class, 'status']);

Route::post('/register', RegisterController::class);

Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return new UserResource($request->user());
});

// Rotas OAuth do Google movidas para routes/web.php (precisam do middleware web:
// sessão/cookies) — o callback vem do Google, fora do fluxo stateful do Sanctum.

Route::middleware(['auth:sanctum', RestrictCaptureTokens::class])->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/reorder', [CategoryController::class, 'reorder']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::patch('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::post('/tasks/process', [TaskController::class, 'process']);
    Route::get('/tasks/heatmap', [TaskController::class, 'heatmap']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    Route::post('/tasks/{task}/subtasks', [SubtaskController::class, 'store']);
    Route::patch('/tasks/{task}/subtasks/{subtask}', [SubtaskController::class, 'update'])->scopeBindings();
    Route::delete('/tasks/{task}/subtasks/{subtask}', [SubtaskController::class, 'destroy'])->scopeBindings();

    Route::get('/habits/summary', [HabitController::class, 'summary']);
    Route::get('/habits/stats', [HabitController::class, 'stats']);
    Route::get('/habits/heatmap', [HabitController::class, 'heatmap']);
    Route::get('/habits', [HabitController::class, 'index']);
    Route::post('/habits', [HabitController::class, 'store']);
    Route::patch('/habits/{habit}', [HabitController::class, 'update']);
    Route::delete('/habits/{habit}', [HabitController::class, 'destroy']);
    Route::post('/habits/{habit}/toggle', [HabitController::class, 'toggle']);
    Route::post('/habits/{habit}/archive', [HabitController::class, 'archive']);
    Route::post('/habits/{habit}/unarchive', [HabitController::class, 'unarchive']);

    // Aggregation dashboards. A dedicated /reports/* namespace sidesteps the
    // literal-before-{param} route hazard entirely (no collision with
    // /tasks/{task} or /habits/{habit}).
    Route::get('/reports/tasks', [ReportsController::class, 'tasks']);
    Route::get('/reports/habits', [ReportsController::class, 'habits']);
    Route::get('/reports/brain', [ReportsController::class, 'brain']);

    // Per-user module on/off toggles.
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::patch('/modules/{key}', [ModuleController::class, 'update']);

    // Configurações globais da instância (hoje: raiz dos vaults do Cérebro).
    Route::get('/settings/vault', [SettingsController::class, 'show']);
    Route::patch('/settings/vault', [SettingsController::class, 'update']);

    // Tokens de captura (Atalho do iPhone). RestrictCaptureTokens (no grupo)
    // garante que um token vazado só consegue capturar no inbox.
    Route::get('/tokens', [TokenController::class, 'index']);
    Route::post('/tokens', [TokenController::class, 'store']);
    Route::delete('/tokens/{tokenId}', [TokenController::class, 'destroy']);

    // Agenda: leitura/escrita ao vivo no Google Calendar (fonte da verdade,
    // sem espelho no banco). Literal /linked ANTES do curinga {eventId}.
    Route::get('/calendar/status', [CalendarController::class, 'status']);
    Route::delete('/calendar/connection', [CalendarController::class, 'disconnect']);
    Route::get('/calendar/events/linked', [CalendarController::class, 'linked']);
    Route::get('/calendar/events', [CalendarController::class, 'index']);
    Route::post('/calendar/events', [CalendarController::class, 'store']);
    Route::get('/calendar/events/{eventId}', [CalendarController::class, 'show']);
    Route::patch('/calendar/events/{eventId}', [CalendarController::class, 'update']);
    Route::delete('/calendar/events/{eventId}', [CalendarController::class, 'destroy']);

    // Módulo Cérebro: gerencia o vault Obsidian do usuário (filesystem é a
    // fonte da verdade; nada de notas no banco). Rotas literais ANTES das
    // curinga {path} — {path} aceita '/' via constraint .*.
    Route::post('/brain/init', [BrainCategoryController::class, 'init']);
    Route::get('/brain/categories', [BrainCategoryController::class, 'index']);
    Route::post('/brain/categories', [BrainCategoryController::class, 'store']);
    Route::patch('/brain/categories/reorder', [BrainCategoryController::class, 'reorder']);
    Route::patch('/brain/categories/{category}', [BrainCategoryController::class, 'update']);
    Route::delete('/brain/categories/{category}', [BrainCategoryController::class, 'destroy']);
    Route::get('/brain/graph', [BrainGraphController::class, 'index']);
    Route::get('/brain/inbox', [BrainInboxController::class, 'index']);
    Route::post('/brain/inbox', [BrainInboxController::class, 'store']);
    Route::post('/brain/inbox/{path}/promote', [BrainInboxController::class, 'promote'])->where('path', '.*');
    Route::delete('/brain/inbox/{path}', [BrainInboxController::class, 'destroy'])->where('path', '.*');
    Route::post('/brain/links', [BrainLinkController::class, 'store']);
    Route::delete('/brain/links/{link}', [BrainLinkController::class, 'destroy']);
    Route::get('/brain/tags', [BrainNoteController::class, 'tags']);
    Route::get('/brain/notes', [BrainNoteController::class, 'index']);
    Route::post('/brain/notes', [BrainNoteController::class, 'store']);
    Route::get('/brain/notes/{path}', [BrainNoteController::class, 'show'])->where('path', '.*');
    Route::patch('/brain/notes/{path}', [BrainNoteController::class, 'update'])->where('path', '.*');
    Route::delete('/brain/notes/{path}', [BrainNoteController::class, 'destroy'])->where('path', '.*');
});
