<?php

namespace App\Support;

class ModuleRegistry
{
    /**
     * Fixed registry of app modules. A per-user row in `user_modules` overrides
     * the `default` here; when no row exists the default applies.
     *
     * label/description são resolvidos via __() a cada chamada (não em
     * constante/array estático) pra respeitar o idioma da request atual,
     * definido pelo middleware SetLocale antes do controller rodar.
     *
     * @return array<int, array{key:string,label:string,description:string,icon:string,version:string,default:bool}>
     */
    public static function all(): array
    {
        return [
            [
                'key' => 'tasks',
                'label' => __('messages.modules.tasks.label'),
                'description' => __('messages.modules.tasks.description'),
                'icon' => 'kanban',
                'version' => '0.1.0',
                'default' => true,
            ],
            [
                'key' => 'habits',
                'label' => __('messages.modules.habits.label'),
                'description' => __('messages.modules.habits.description'),
                'icon' => 'repeat',
                'version' => '0.1.0',
                'default' => true,
            ],
            [
                // Opt-in: depende de um vault Obsidian montado em VAULTS_PATH.
                'key' => 'brain',
                'label' => __('messages.modules.brain.label'),
                'description' => __('messages.modules.brain.description'),
                'icon' => 'brain',
                'version' => '0.1.0',
                'default' => false,
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
