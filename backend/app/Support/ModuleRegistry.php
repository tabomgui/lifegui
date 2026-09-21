<?php

namespace App\Support;

class ModuleRegistry
{
    /**
     * Fixed registry of app modules. A per-user row in `user_modules` overrides
     * the `default` here; when no row exists the default applies.
     *
     * @return array<int, array{key:string,label:string,description:string,icon:string,version:string,default:bool}>
     */
    public static function all(): array
    {
        return [
            [
                'key' => 'tasks',
                'label' => 'Tarefas',
                'description' => 'Afazeres do dia a dia.',
                'icon' => 'kanban',
                'version' => '0.1.0',
                'default' => true,
            ],
            [
                'key' => 'habits',
                'label' => 'Hábitos',
                'description' => 'Check-in diário e sequências.',
                'icon' => 'repeat',
                'version' => '0.1.0',
                'default' => true,
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    public static function has(string $key): bool
    {
        return in_array($key, self::keys(), true);
    }

    /**
     * @return array{key:string,label:string,description:string,icon:string,version:string,default:bool}|null
     */
    public static function find(string $key): ?array
    {
        foreach (self::all() as $module) {
            if ($module['key'] === $key) {
                return $module;
            }
        }

        return null;
    }
}
