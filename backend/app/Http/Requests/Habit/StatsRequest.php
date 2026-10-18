<?php
namespace App\Http\Requests\Habit;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class StatsRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
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

            // Período INCLUSIVO (from e to contam como dias): diff + 1 é o nº de dias da janela.
            $periodDays = $fromDate->diffInDays($toDate, true) + 1;
            if ($periodDays > 366) {
                $validator->errors()->add('to', __('messages.validation.max_period', ['days' => 366]));
            }
        });
    }
}
