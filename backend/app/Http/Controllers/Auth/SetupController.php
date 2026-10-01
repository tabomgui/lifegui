<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\GoogleCredentials;
use Illuminate\Http\JsonResponse;

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
}
