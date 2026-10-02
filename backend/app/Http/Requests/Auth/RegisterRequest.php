<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) config('lifegui.registration_enabled');
    }

    protected function failedAuthorization(): void
    {
        throw new AuthorizationException('Cadastro desativado nesta instância.');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'locale' => ['nullable', 'string', \Illuminate\Validation\Rule::in(\App\Support\Locale::SUPPORTED)],
        ];
    }
}
