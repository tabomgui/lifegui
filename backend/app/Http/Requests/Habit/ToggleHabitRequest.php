<?php

namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class ToggleHabitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.Carbon::now()->addDay()->toDateString()],
            'state' => ['nullable', 'in:done,skip,none'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.before_or_equal' => __('messages.validation.future_date'),
        ];
    }
}
