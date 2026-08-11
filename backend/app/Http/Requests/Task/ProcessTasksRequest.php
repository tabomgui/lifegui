<?php
namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class ProcessTasksRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string'],
        ];
    }

    public function lines(): array
    {
        return collect(preg_split('/\r\n|\r|\n/', $this->input('text')))
            ->map(fn ($l) => trim($l))
            ->filter()
            ->values()
            ->all();
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (empty($this->lines())) {
                $validator->errors()->add('text', 'Escreva ao menos uma tarefa.');
            }
        });
    }
}
