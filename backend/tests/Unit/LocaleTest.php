<?php

use App\Support\Locale;

test('negocia idioma a partir da lista do Accept-Language', function (array $languages, ?string $expected) {
    expect(Locale::negotiate($languages))->toBe($expected);
})->with([
    'pt-BR' => [['pt_BR', 'en'], 'pt-BR'],
    'pt puro' => [['pt'], 'pt-BR'],
    'pt-PT' => [['pt_PT'], 'pt-BR'],
    'en-US' => [['en_US', 'pt_BR'], 'en'],
    'ordem importa' => [['en', 'pt_BR'], 'en'],
    'desconhecido e depois pt' => [['fr', 'pt'], 'pt-BR'],
    'só desconhecido' => [['fr', 'de'], null],
    'vazio' => [[], null],
]);

test('converte para o código do Laravel e de volta', function () {
    expect(Locale::toLaravel('pt-BR'))->toBe('pt_BR')
        ->and(Locale::toLaravel('en'))->toBe('en')
        ->and(Locale::fromLaravel('pt_BR'))->toBe('pt-BR')
        ->and(Locale::fromLaravel('en'))->toBe('en');
});

test('valida locales suportados', function () {
    expect(Locale::isSupported('en'))->toBeTrue()
        ->and(Locale::isSupported('pt-BR'))->toBeTrue()
        ->and(Locale::isSupported('pt'))->toBeFalse();
});
