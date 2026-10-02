<?php

namespace App\Mcp\Tools;

use App\Support\Vault\InboxCaptureService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('capture')]
#[Description('Stores a link or text in the second-brain inbox to process later. Same flow as the iPhone Shortcut. Use when the user says "save this", "keep this link", "note this for later".')]
class CaptureTool extends Tool
{
    public function __construct(private InboxCaptureService $capture) {}

    public function handle(Request $request): Response
    {
        $request->validate([
            'content' => ['required', 'string', 'max:20000'],
            'title' => ['nullable', 'string', 'max:150'],
        ]);

        $created = $this->capture->capture($request->get('content'), $request->get('title'));

        if ($created === null) {
            return Response::error(__('mcp.capture.inbox_missing'));
        }

        return Response::text(__('mcp.capture.captured', ['title' => $created['title'], 'path' => $created['path']]));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'content' => $schema->string()->description('Link or text to save.')->required(),
            'title' => $schema->string()->description('Optional title for the capture.'),
        ];
    }
}
