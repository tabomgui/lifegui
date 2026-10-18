<?php

namespace App\Support\Calendar;

use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * O Google Calendar recusou uma chamada. Vira 502 com a razão real (API
 * desativada, permissão insuficiente, evento inexistente…) em vez de um 500
 * genérico — o front mostra a mensagem no toast.
 */
class CalendarApiException extends RuntimeException
{
    public function __construct(private int $status, string $message)
    {
        parent::__construct($message);
    }

    public static function fromResponse(Response $response): self
    {
        $reason = $response->json('error.message') ?? $response->reason() ?? __('messages.calendar.unknown_error');

        $message = match (true) {
            str_contains($reason, 'has not been used in project'),
            str_contains($reason, 'is disabled') => __('messages.calendar.api_disabled'),
            $response->status() === 401,
            str_contains($reason, 'insufficient') => __('messages.calendar.insufficient_access'),
            $response->status() === 404 => __('messages.calendar.event_not_found'),
            default => __('messages.calendar.api_error', ['reason' => $reason]),
        };

        return new self($response->status() === 404 ? 404 : 502, $message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], $this->status);
    }
}
