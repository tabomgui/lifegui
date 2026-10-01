<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SetupRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\GoogleCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class SetupController extends Controller
{
    /**
     * Estado público da instância: o SPA decide entre /setup, login e cadastro.
     */
    public function status(): JsonResponse
    {
        return response()->json(['data' => [
            'needs_setup' => ! User::query()->exists(),
            'registration_enabled' => (bool) config('lifegui.registration_enabled'),
            'google_login_enabled' => GoogleCredentials::configured(),
        ]]);
    }

    public function store(SetupRequest $request): JsonResponse
    {
        // O lock serializa setups concorrentes: só o primeiro encontra a tabela vazia.
        $user = Cache::lock('lifegui:setup', 10)->block(5, function () use ($request) {
            if (User::query()->exists()) {
                return null;
            }

            return User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
        });

        abort_if($user === null, 409, 'Esta instância já foi configurada.');

        Auth::login($user);

        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }
}
