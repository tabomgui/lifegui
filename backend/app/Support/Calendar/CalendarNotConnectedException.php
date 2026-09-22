<?php

namespace App\Support\Calendar;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Usuário sem Google Calendar conectado (ou acesso revogado no Google).
 * Renderiza como 409 — mesmo padrão do "vault não encontrado" do Cérebro:
 * o front mostra o call-to-action de conectar.
 */
class CalendarNotConnectedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Google Calendar não conectado.');
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 409);
    }
}
