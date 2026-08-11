<?php
namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;

class ToggleHabitRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d'],
        ];
    }
}
