<?php

namespace App\Http\Requests\Brain;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLinkRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['task', 'habit'])],
            'id' => ['required', 'integer'],
            'note_path' => ['required', 'string', 'max:500'],
        ];
    }
}
