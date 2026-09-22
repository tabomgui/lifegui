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
        $reason = $response->json('error.message') ?? $response->reason() ?? 'erro desconhecido';

        $message = match (true) {
            str_contains($reason, 'has not been used in project'),
            str_contains($reason, 'is disabled') => 'A Google Calendar API está desativada no projeto do Google Cloud. Ative-a e tente de novo.',
            $response->status() === 401,
            str_contains($reason, 'insufficient') => 'O Google recusou o acesso à agenda. Desconecte e conecte de novo em Configurações.',
            $response->status() === 404 => 'Evento não encontrado no Google Calendar.',
            default => 'O Google Calendar recusou a operação: '.$reason,
        };

        return new self($response->status() === 404 ? 404 : 502, $message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], $this->status);
    }
}
