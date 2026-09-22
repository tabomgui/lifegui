<?php

namespace App\Http\Requests\Brain;

use App\Support\Vault\VaultService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNoteRequest extends FormRequest
{
    public function rules(): array
    {
        // Categoria precisa ser uma pasta de conteúdo existente no vault do
        // usuário — isso já elimina traversal ('..' nunca está na lista).
        $categories = app(VaultService::class)->categories();

        return [
            'category' => ['required', 'string', Rule::in($categories)],
            'title' => ['required', 'string', 'max:150'],
            'fonte' => ['nullable', 'string', 'max:2000'],
            'resumo' => ['nullable', 'string', 'max:2000'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'body' => ['nullable', 'string'],
        ];
    }
}
