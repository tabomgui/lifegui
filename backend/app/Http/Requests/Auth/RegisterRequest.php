<?php

namespace App\Http\Requests\Auth;

use App\Support\Locale;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) config('lifegui.registration_enabled');
    }

    protected function failedAuthorization(): void
    {
        throw new AuthorizationException(__('messages.auth.registration_disabled'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'locale' => ['nullable', 'string', Rule::in(Locale::SUPPORTED)],
        ];
    }
}
