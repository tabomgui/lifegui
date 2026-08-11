<?php

namespace App\Http\Controllers;

use App\Http\Requests\Module\UpdateModuleRequest;
use App\Models\UserModule;
use App\Support\ModuleRegistry;
use Illuminate\Http\JsonResponse;

class ModuleController extends Controller
{
    public function index(): JsonResponse
    {
        $overrides = UserModule::query()->pluck('enabled', 'key');

        $data = array_map(function (array $module) use ($overrides) {
            return [
                'key' => $module['key'],
                'label' => $module['label'],
                'description' => $module['description'],
                'icon' => $module['icon'],
                'version' => $module['version'],
                'enabled' => $overrides->has($module['key'])
                    ? (bool) $overrides->get($module['key'])
                    : $module['default'],
            ];
        }, ModuleRegistry::all());

        return response()->json(['data' => $data]);
    }

    public function update(UpdateModuleRequest $request, string $key): JsonResponse
    {
        $module = ModuleRegistry::find($key);

        if ($module === null) {
            abort(404, 'Unknown module.');
        }

        $enabled = $request->validated('enabled');

        $row = UserModule::updateOrCreate(
            ['user_id' => $request->user()->id, 'key' => $key],
            ['enabled' => $enabled],
        );

        return response()->json(['data' => [
            'key' => $module['key'],
            'label' => $module['label'],
            'description' => $module['description'],
            'icon' => $module['icon'],
            'version' => $module['version'],
            'enabled' => $row->enabled,
        ]]);
    }
}
