<?php
namespace App\Http\Requests\Habit;

use Illuminate\Foundation\Http\FormRequest;

class SummaryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'week' => ['required', 'date_format:Y-m-d'],
        ];
    }
}
