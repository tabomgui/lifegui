<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateMeRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /** Só preferências do próprio usuário; hoje, o idioma. */
    public function update(UpdateMeRequest $request): UserResource
    {
        $request->user()->update(['locale' => $request->validated('locale')]);

        return new UserResource($request->user());
    }
}
