<?php
use App\Models\Category;
use App\Models\User;

test('global scope só retorna categorias do usuário logado', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Category::factory()->for($me)->create(['name' => 'Minha']);
    Category::factory()->for($other)->create(['name' => 'Dele']);

    $this->actingAs($me);

    expect(Category::count())->toBe(1);
    expect(Category::first()->name)->toBe('Minha');
});

test('user_id é preenchido automaticamente ao criar', function () {
    $me = User::factory()->create();
    $this->actingAs($me);

    $c = Category::create(['name' => 'Nova', 'color' => '#f00', 'icon' => 'home', 'position' => 0]);

    expect($c->user_id)->toBe($me->id);
});
