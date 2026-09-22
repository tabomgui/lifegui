<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

// ---- Helpers do módulo Cérebro (tests/Feature/Brain) ----
// Pressupõem beforeEach que define $this->vaultRoot (config vault.root) e
// $this->user autenticado.

function vaultPath(): string
{
    return test()->vaultRoot.'/'.test()->user->id;
}

function makeNote(string $relative, array $frontmatter = [], string $body = "corpo\n"): void
{
    $absolute = vaultPath().'/'.$relative;
    Illuminate\Support\Facades\File::ensureDirectoryExists(dirname($absolute));
    $yaml = '';
    if ($frontmatter !== []) {
        $lines = collect($frontmatter)
            ->map(fn ($v, $k) => is_array($v) ? "$k: [".implode(', ', $v).']' : "$k: $v")
            ->implode("\n");
        $yaml = "---\n{$lines}\n---\n";
    }
    file_put_contents($absolute, $yaml.$body);
}
