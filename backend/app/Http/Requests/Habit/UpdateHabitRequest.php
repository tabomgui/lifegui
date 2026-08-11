<?php
namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHabitRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'emoji' => ['nullable', 'string', 'max:16'],
            'target_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'color' => ['nullable', 'string', 'max:32'],
        ];
    }
}
