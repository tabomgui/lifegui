<?php
use App\Models\Category;
use App\Models\User;

test('reordena categorias', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $a = Category::factory()->for($user)->create(['position' => 0]);
    $b = Category::factory()->for($user)->create(['position' => 1]);

    $this->patchJson('/api/categories/reorder', ['ids' => [$b->id, $a->id]])
        ->assertNoContent();

    expect($a->fresh()->position)->toBe(1);
    expect($b->fresh()->position)->toBe(0);
});

test('reordenar com id de categoria de outro usuário é rejeitado (422)', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $a = Category::factory()->for($user)->create(['position' => 0]);
    $other = Category::factory()->for(User::factory())->create(['position' => 0]);

    $this->patchJson('/api/categories/reorder', ['ids' => [$a->id, $other->id]])
        ->assertStatus(422);

    expect($a->fresh()->position)->toBe(0);
});
