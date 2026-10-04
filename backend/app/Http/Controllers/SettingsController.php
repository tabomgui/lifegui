<?php

namespace App\Http\Controllers;

use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Só leitura: a raiz dos vaults vale pra instância inteira e vem do deploy
     * (VAULTS_PATH em backend/.env), nunca da UI.
     */
    public function show(VaultService $vault): JsonResponse
    {
        $root = rtrim(config('vault.root'), '/');

        return response()->json(['data' => [
            'effective' => $root,
            'exists' => is_dir($root),
            'user_vault' => $vault->root(),
            'initialized' => $vault->initialized(),
        ]]);
    }
}
