<?php

namespace App\Http\Resources;

use App\Support\Vault\VaultService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NoteLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'note_path' => $this->note_path,
            'title' => basename($this->note_path, '.md'),
            // false quando a nota foi renomeada/movida pelo Obsidian; a UI
            // oferece revincular.
            'exists' => app(VaultService::class)->resolve($this->note_path) !== null,
        ];
    }
}
