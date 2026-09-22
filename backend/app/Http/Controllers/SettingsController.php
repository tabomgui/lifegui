<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(VaultService $vault): JsonResponse
    {
        return response()->json(['data' => $this->payload($vault)]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Absoluto e sem '..'; vazio/null volta pro padrão (storage/vaults).
            'vaults_path' => ['nullable', 'string', 'max:500', 'regex:/^\/(?!.*\.\.).*$/'],
        ]);

        AppSetting::put('vaults_path', $validated['vaults_path'] ?: null);

        // VaultService memoiza a raiz por instância; uma nova enxerga o valor salvo.
        return response()->json(['data' => $this->payload(app(VaultService::class))]);
    }

    /**
     * @return array{vaults_path: string|null, effective: string, exists: bool, user_vault: string, initialized: bool}
     */
    private function payload(VaultService $vault): array
    {
        $stored = AppSetting::get('vaults_path');
        $effective = rtrim($stored ?: config('vault.root'), '/');

        return [
            'vaults_path' => $stored,
            'effective' => $effective,
            'exists' => is_dir($effective),
            'user_vault' => $vault->root(),
            'initialized' => $vault->initialized(),
        ];
    }
}
