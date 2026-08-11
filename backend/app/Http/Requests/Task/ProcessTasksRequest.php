<?php
namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class ProcessTasksRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'max:20000'],
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
            $lines = $this->lines();

            if (empty($lines)) {
                $validator->errors()->add('text', 'Escreva ao menos uma tarefa.');
            }

            if (count($lines) > 500) {
                $validator->errors()->add('text', 'Muitas tarefas de uma vez (máx. 500).');
            }
        });
    }
}
