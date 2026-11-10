<?php
namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;

class StoreHabitRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        if (! $this->has('type')) {
            $this->merge(['type' => 'positive']);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'type' => ['required', 'in:positive,negative'],
            'target_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'color' => ['nullable', 'string', 'max:32'],
            'estimated_daily_cost' => ['required_if:type,negative', 'nullable', 'numeric', 'min:0'],
        ];
    }
}
