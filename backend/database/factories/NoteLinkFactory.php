<?php

namespace Database\Factories;

use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'note_path' => 'Receitas/'.$this->faker->unique()->word().'.md',
            'linkable_type' => Task::class,
            'linkable_id' => Task::factory(),
        ];
    }
}
