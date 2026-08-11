<?php
namespace App\Http\Requests\Report;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class HabitReportRequest extends FormRequest
{
    // auth handled by the auth:sanctum middleware on the route group.
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'tz' => ['nullable', 'string'],
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

            // Janela INCLUSIVA: diff + 1 é o nº de dias. Cap de 400 dias (guarda de custo do record streak).
            $periodDays = $fromDate->diffInDays($toDate, true) + 1;
            if ($periodDays > 400) {
                $validator->errors()->add('to', 'Período máximo de 400 dias.');
            }
        });
    }
}
