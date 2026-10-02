<?php

namespace App\Support\Vault;

/**
 * Criação de capturas no 00-Inbox do vault — compartilhada entre a rota HTTP
 * (SPA / Atalho do iPhone) e a tool MCP `capture`.
 */
class InboxCaptureService
{
    public const INBOX = '00-Inbox';

    public function __construct(private VaultService $vault) {}

    /**
     * @return array{path: string, title: string}|null null se o inbox não existe no vault.
     */
    public function capture(string $content, ?string $title = null): ?array
    {
        $name = $title !== null
            ? trim(str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', '#', '[', ']'], '', $title))
            : '';

        if ($name === '') {
            $name = 'captura-'.now()->format('Y-m-d-His');
        }

        $path = self::INBOX."/{$name}.md";

        // Colisão de nome: sufixa com horário em vez de sobrescrever.
        if ($this->vault->resolve($path) !== null) {
            $path = self::INBOX."/{$name}-".now()->format('His').'.md';
        }

        $frontmatter = ['data_salvo' => now()->format('Y-m-d'), 'status' => 'novo'];
        $written = $this->vault->write($path, $frontmatter, $content, mustExist: false);

        if ($written === null) {
            return null;
        }

        return ['path' => $path, 'title' => basename($path, '.md')];
    }
}
