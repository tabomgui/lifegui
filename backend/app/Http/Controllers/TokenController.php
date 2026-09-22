<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()
            ->orderByDesc('id')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'created_at' => $t->created_at?->toIso8601String(),
                'last_used_at' => $t->last_used_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $tokens]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => ['required', 'string', 'max:60']]);

        // Ability única: RestrictCaptureTokens limita esses tokens ao POST do inbox.
        $token = $request->user()->createToken($validated['name'], ['brain:capture']);

        return response()->json(['data' => [
            'id' => $token->accessToken->id,
            'name' => $validated['name'],
            // Mostrado UMA vez; só o hash fica no banco.
            'token' => $token->plainTextToken,
        ]], 201);
    }

    public function destroy(Request $request, int $tokenId): JsonResponse
    {
        $deleted = $request->user()->tokens()->where('id', $tokenId)->delete();
        abort_unless($deleted > 0, 404);

        return response()->json(null, 204);
    }
}
