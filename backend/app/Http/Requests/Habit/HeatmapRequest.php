<?php

namespace App\Http\Requests\Habit;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class HeatmapRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'habit_id' => ['nullable', 'integer', Rule::exists('habits', 'id')->where('user_id', $this->user()->id)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $from = $this->input('from');
            $to = $this->input('to');

            if (! $from || ! $to) {
                return;
            }

            try {
                $fromDate = Carbon::createFromFormat('Y-m-d', $from)->startOfDay();
                $toDate = Carbon::createFromFormat('Y-m-d', $to)->startOfDay();
            } catch (\Throwable) {
                return;
            }

            // Período INCLUSIVO (from e to contam): diff + 1 é o nº de dias da janela.
            $periodDays = $fromDate->diffInDays($toDate, true) + 1;
            if ($periodDays > 400) {
                $validator->errors()->add('to', __('messages.validation.max_period', ['days' => 400]));
            }
        });
    }
}
