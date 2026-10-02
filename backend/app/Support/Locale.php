<?php

namespace App\Support;

/**
 * Idiomas da interface. A API, o banco e o front usam 'en' e 'pt-BR';
 * as pastas de tradução do Laravel usam 'en' e 'pt_BR'.
 */
final class Locale
{
    public const SUPPORTED = ['en', 'pt-BR'];

    public const DEFAULT = 'en';

    public static function isSupported(?string $locale): bool
    {
        return in_array($locale, self::SUPPORTED, true);
    }

    /**
     * Primeiro idioma suportado da lista já ordenada por preferência
     * (formato de Request::getLanguages(): 'pt_BR', 'en_US', 'pt').
     *
     * @param  list<string>  $languages
     */
    public static function negotiate(array $languages): ?string
    {
        foreach ($languages as $language) {
            $primary = strtolower(strtok($language, '_-') ?: '');
            if ($primary === 'pt') {
                return 'pt-BR';
            }
            if ($primary === 'en') {
                return 'en';
            }
        }

        return null;
    }

    public static function toLaravel(string $locale): string
    {
        return $locale === 'pt-BR' ? 'pt_BR' : 'en';
    }

    public static function fromLaravel(string $locale): string
    {
        return $locale === 'pt_BR' ? 'pt-BR' : 'en';
    }

    /** Idioma ativo na request atual, no formato da API. */
    public static function current(): string
    {
        return self::fromLaravel(app()->getLocale());
    }
}
