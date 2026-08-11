<?php
namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;

class StoreHabitRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'target_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'color' => ['nullable', 'string', 'max:32'],
        ];
    }
}
