<?php

namespace App\Http\Requests\Auth;

use App\Support\Locale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'locale' => ['required_without:timezone', 'string', Rule::in(Locale::SUPPORTED)],
            'timezone' => ['required_without:locale', 'string', 'timezone:all'],
        ];
    }
}
