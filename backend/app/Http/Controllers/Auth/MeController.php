<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Support\Locale;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /** Só preferências do próprio usuário; hoje, o idioma. */
    public function update(Request $request): UserResource
    {
        $data = $request->validate([
            'locale' => ['required', 'string', Rule::in(Locale::SUPPORTED)],
        ]);

        $request->user()->update(['locale' => $data['locale']]);

        return new UserResource($request->user());
    }
}
