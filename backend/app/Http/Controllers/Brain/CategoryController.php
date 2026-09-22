<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(VaultService $vault): JsonResponse
    {
        if (! $vault->initialized()) {
            return response()->json(['data' => [], 'initialized' => false]);
        }

        $data = array_map(function (string $name) use ($vault) {
            $counts = [];
            $total = 0;
            foreach ($vault->listMarkdown($name) as $path) {
                $note = $vault->read($path);
                $status = $note['frontmatter']['status'] ?? null;
                if (is_string($status) && $status !== '') {
                    $counts[$status] = ($counts[$status] ?? 0) + 1;
                }
                $total++;
            }

            return ['name' => $name, 'counts' => (object) $counts, 'total' => $total];
        }, $vault->categories());

        return response()->json(['data' => $data, 'initialized' => true]);
    }
}
