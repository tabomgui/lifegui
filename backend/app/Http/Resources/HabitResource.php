<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HabitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'icon' => $this->icon,
            'type' => $this->type,
            'target_per_week' => $this->target_per_week,
            'color' => $this->color,
            'estimated_daily_cost' => $this->estimated_daily_cost,
            'archived_at' => $this->archived_at?->toIso8601String(),
            'note_links' => NoteLinkResource::collection($this->whenLoaded('noteLinks')),
        ];
    }
}
