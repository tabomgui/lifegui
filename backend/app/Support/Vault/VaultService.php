<?php

namespace App\Support\Vault;

use Illuminate\Support\Facades\Auth;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

/**
 * Única porta de entrada para o vault Obsidian do usuário autenticado.
 *
 * O vault é a fonte da verdade e permanece Obsidian-puro: este serviço só lê
 * e escreve arquivos .md com frontmatter YAML, preservando o corpo intacto.
 * Todo caminho vindo de fora passa por resolve(), que confina o acesso à
 * raiz do usuário (config vault.root + '/' + user_id).
 */
class VaultService
{
    public function root(): string
    {
        // Raiz da instância vem só do deploy (VAULTS_PATH em backend/.env; o
        // environment do compose não chega ao processo do artisan serve).
        return rtrim(config('vault.root'), '/').'/'.Auth::id();
    }

    public function initialized(): bool
    {
        return is_dir($this->root());
    }

    /**
     * Resolve um caminho relativo para absoluto dentro do vault do usuário.
     * Retorna null para qualquer coisa fora do contrato: absoluto, traversal
     * (..), barra invertida, extensão diferente de .md, ou (quando $mustExist)
     * arquivo inexistente. Symlinks são desreferenciados via realpath e
     * precisam continuar dentro da raiz.
     */
    public function resolve(string $relative, bool $mustExist = true): ?string
    {
        $relative = trim($relative);

        if ($relative === '' || str_starts_with($relative, '/') || str_contains($relative, '\\')) {
            return null;
        }

        foreach (explode('/', $relative) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                return null;
            }
        }

        if (! str_ends_with($relative, '.md')) {
            return null;
        }

        $rootReal = realpath($this->root());
        if ($rootReal === false) {
            return null;
        }

        $absolute = $this->root().'/'.$relative;

        if ($mustExist) {
            $real = realpath($absolute);

            return ($real !== false && str_starts_with($real, $rootReal.'/') && is_file($real)) ? $real : null;
        }

        // Criação: o arquivo ainda não existe; validamos o diretório pai.
        $parent = realpath(dirname($absolute));

        if ($parent === false || ($parent !== $rootReal && ! str_starts_with($parent, $rootReal.'/'))) {
            return null;
        }

        return $parent.'/'.basename($absolute);
    }

    /**
     * Resolve um diretório relativo (categoria, 00-Inbox…) dentro do vault.
     */
    public function resolveDir(string $relative): ?string
    {
        $relative = trim($relative, "/ \t");

        if ($relative === '' || str_contains($relative, '\\')) {
            return null;
        }

        foreach (explode('/', $relative) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                return null;
            }
        }

        $rootReal = realpath($this->root());
        if ($rootReal === false) {
            return null;
        }

        $real = realpath($this->root().'/'.$relative);

        return ($real !== false && str_starts_with($real, $rootReal.'/') && is_dir($real)) ? $real : null;
    }

    /**
     * Caminhos relativos dos .md de um diretório do vault (não recursivo).
     *
     * @return array<int, string>
     */
    public function listMarkdown(string $dir): array
    {
        $absolute = $this->resolveDir($dir);
        if ($absolute === null) {
            return [];
        }

        $files = [];
        foreach (scandir($absolute) as $entry) {
            if (str_ends_with($entry, '.md') && is_file($absolute.'/'.$entry)) {
                $files[] = $dir.'/'.$entry;
            }
        }

        sort($files, SORT_NATURAL | SORT_FLAG_CASE);

        return $files;
    }

    /**
     * Subpastas de primeiro nível que são categorias de conteúdo
     * (exclui 00-Inbox, Templates e diretórios ocultos).
     *
     * @return array<int, string>
     */
    public function categories(): array
    {
        if (! $this->initialized()) {
            return [];
        }

        $dirs = [];
        foreach (scandir($this->root()) as $entry) {
            if (str_starts_with($entry, '.') || in_array($entry, ['00-Inbox', 'Templates'], true)) {
                continue;
            }
            if (is_dir($this->root().'/'.$entry)) {
                $dirs[] = $entry;
            }
        }

        sort($dirs, SORT_NATURAL | SORT_FLAG_CASE);

        return $dirs;
    }

    /**
     * Alvos de [[wikilinks]] do corpo: ignora #âncora e |rótulo, preserva o
     * nome do alvo como escrito (resolução por título fica com o chamador).
     *
     * @return array<int, string>
     */
    public function extractWikilinks(string $body): array
    {
        preg_match_all('/\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/', $body, $matches);

        return array_values(array_filter(array_map('trim', $matches[1]), fn ($t) => $t !== ''));
    }

    /**
     * Metadados de UI das categorias (ordem, ícone, cor) — vivem no próprio
     * vault, em .lifegui/categories.json: o Obsidian ignora o dotfile e o
     * arquivo sincroniza junto com as notas. Conteúdo continua sendo só .md.
     *
     * @return array{order: array<int, string>, meta: array<string, array{icon?: string, color?: string}>}
     */
    public function readCategoryMeta(): array
    {
        $file = $this->root().'/.lifegui/categories.json';
        $json = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;

        return [
            'order' => array_values(array_filter((array) ($json['order'] ?? []), 'is_string')),
            'meta' => is_array($json['meta'] ?? null) ? $json['meta'] : [],
        ];
    }

    public function writeCategoryMeta(array $meta): void
    {
        $dir = $this->root().'/.lifegui';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents(
            $dir.'/categories.json',
            json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }

    /**
     * @return array{frontmatter: array<string, mixed>, body: string}|null
     */
    public function read(string $relative): ?array
    {
        $absolute = $this->resolve($relative);
        if ($absolute === null) {
            return null;
        }

        return $this->parse((string) file_get_contents($absolute));
    }

    /**
     * Separa frontmatter YAML (bloco --- inicial) do corpo, sem tocar no corpo.
     * Frontmatter inválido vira [] em vez de erro: nota criada à mão no
     * Obsidian não pode derrubar a listagem.
     *
     * @return array{frontmatter: array<string, mixed>, body: string}
     */
    public function parse(string $raw): array
    {
        if (preg_match('/\A---\r?\n(.*?)\r?\n---(\r?\n|\z)/s', $raw, $m) === 1) {
            try {
                $frontmatter = Yaml::parse($m[1]);
            } catch (ParseException) {
                $frontmatter = [];
            }

            return [
                'frontmatter' => is_array($frontmatter) ? $frontmatter : [],
                'body' => substr($raw, strlen($m[0])),
            ];
        }

        return ['frontmatter' => [], 'body' => $raw];
    }

    /**
     * Grava a nota: frontmatter YAML re-serializado + corpo exatamente como veio.
     */
    public function write(string $relative, array $frontmatter, string $body, bool $mustExist = true): ?string
    {
        $absolute = $this->resolve($relative, $mustExist);
        if ($absolute === null) {
            return null;
        }

        file_put_contents($absolute, $this->render($frontmatter, $body));

        return $absolute;
    }

    public function render(array $frontmatter, string $body): string
    {
        $yaml = $frontmatter === []
            ? ''
            : '---'."\n".Yaml::dump($frontmatter, 2, 2).'---'."\n";

        return $yaml.$body;
    }
}
