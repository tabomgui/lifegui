<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Brain\CategoryController as BrainCategoryController;
use App\Http\Controllers\Brain\InboxController as BrainInboxController;
use App\Http\Controllers\Brain\LinkController as BrainLinkController;
use App\Http\Controllers\Brain\NoteController as BrainNoteController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\HabitController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TaskController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', RegisterController::class);

Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return new UserResource($request->user());
});

// Rotas OAuth do Google movidas para routes/web.php (precisam do middleware web:
// sessão/cookies) — o callback vem do Google, fora do fluxo stateful do Sanctum.

Route::middleware('auth:sanctum')->group(function () {
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

    // Per-user module on/off toggles.
    Route::get('/modules', [ModuleController::class, 'index']);
    Route::patch('/modules/{key}', [ModuleController::class, 'update']);

    // Módulo Cérebro: gerencia o vault Obsidian do usuário (filesystem é a
    // fonte da verdade; nada de notas no banco). Rotas literais ANTES das
    // curinga {path} — {path} aceita '/' via constraint .*.
    Route::get('/brain/categories', [BrainCategoryController::class, 'index']);
    Route::get('/brain/inbox', [BrainInboxController::class, 'index']);
    Route::post('/brain/inbox', [BrainInboxController::class, 'store']);
    Route::post('/brain/inbox/{path}/promote', [BrainInboxController::class, 'promote'])->where('path', '.*');
    Route::post('/brain/links', [BrainLinkController::class, 'store']);
    Route::delete('/brain/links/{link}', [BrainLinkController::class, 'destroy']);
    Route::get('/brain/notes', [BrainNoteController::class, 'index']);
    Route::post('/brain/notes', [BrainNoteController::class, 'store']);
    Route::get('/brain/notes/{path}', [BrainNoteController::class, 'show'])->where('path', '.*');
    Route::patch('/brain/notes/{path}', [BrainNoteController::class, 'update'])->where('path', '.*');
});
