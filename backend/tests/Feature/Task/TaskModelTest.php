<?php
use App\Models\Category;
use App\Models\Task;
use App\Models\User;

test('task pertence ao usuário e opcionalmente a uma categoria', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $cat = Category::factory()->for($user)->create();
    $task = Task::factory()->for($user)->create(['category_id' => $cat->id]);

    expect($task->user_id)->toBe($user->id);
    expect($task->category->id)->toBe($cat->id);
    expect($task->status)->toBeIn(['todo', 'doing', 'done']);
});

test('apagar categoria seta category_id da task para null', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $cat = Category::factory()->for($user)->create();
    $task = Task::factory()->for($user)->create(['category_id' => $cat->id]);

    $cat->delete();

    expect($task->fresh()->category_id)->toBeNull();
});
