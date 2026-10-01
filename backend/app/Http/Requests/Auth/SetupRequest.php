<?php

namespace App\Http\Requests\Auth;

/**
 * Mesmas regras do cadastro, mas sempre autorizado: a restrição "só sem
 * usuários" fica no SetupController, sob lock.
 */
class SetupRequest extends RegisterRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
