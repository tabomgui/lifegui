<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * Encerra o wizard de primeiro uso ("Começar" ou "Pular"). Idempotente.
     */
    public function complete(Request $request): UserResource
    {
        $user = $request->user();

        if ($user->onboarded_at === null) {
            $user->forceFill(['onboarded_at' => now()])->save();
        }

        return new UserResource($user);
    }
}
