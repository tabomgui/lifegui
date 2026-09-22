<?php

namespace App\Http\Requests\Brain;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNoteRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string'],
            'frontmatter' => ['nullable', 'array'],
            'frontmatter.status' => ['nullable', Rule::in(['novo', 'estudando', 'concluido', 'a-revisar'])],
            'frontmatter.tags' => ['nullable', 'array'],
            'frontmatter.tags.*' => ['string', 'max:50'],
            'frontmatter.fonte' => ['nullable', 'string', 'max:2000'],
            'frontmatter.resumo' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
