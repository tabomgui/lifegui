<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'notes' => $this->notes,
            'status' => $this->status,
            'position' => $this->position,
            'category_id' => $this->category_id,
            'due_date' => $this->due_date?->toDateString(),
            'subtasks' => SubtaskResource::collection($this->whenLoaded('subtasks')),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'subtasks_done_count' => $this->whenCounted('subtasks_done_count'),
        ];
    }
}
