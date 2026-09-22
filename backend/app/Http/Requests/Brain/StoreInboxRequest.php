<?php

namespace App\Http\Requests\Brain;

use Illuminate\Foundation\Http\FormRequest;

class StoreInboxRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:65535'],
            'title' => ['nullable', 'string', 'max:150'],
        ];
    }
}
