<?php

namespace App\Support\Calendar;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Gateway do Google Calendar — o "VaultService da agenda". O calendário
 * `primary` do usuário é a fonte da verdade: nada de evento no MySQL. O
 * vínculo com nota/tarefa/hábito vai em extendedProperties.private do
 * próprio evento (lifegui_type / lifegui_ref).
 */
class CalendarService
{
    private const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    public function __construct(private GoogleTokenService $tokens) {}

    /**
     * Eventos do período, recorrências expandidas em ocorrências
     * (singleEvents) — o formato que a tela de agenda consome.
     */
    public function events(User $user, CarbonInterface $from, CarbonInterface $to): array
    {
        $items = [];
        $pageToken = null;

        do {
            $query = http_build_query(array_filter([
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'timeMin' => $from->toRfc3339String(),
                'timeMax' => $to->toRfc3339String(),
                'maxResults' => 250,
                'pageToken' => $pageToken,
            ]));

            $response = $this->guard($this->http($user)->get(self::BASE.'?'.$query));
            $items = array_merge($items, $response->json('items') ?? []);
            $pageToken = $response->json('nextPageToken');
        } while ($pageToken);

        return array_map(fn (array $event) => $this->normalize($event), $items);
    }

    /**
     * Eventos "mestre" vinculados a um item do lifegui, achados pelo filtro
     * nativo de extendedProperties — é isso que dispensa tabela de vínculo.
     * Sem singleEvents: o mestre carrega a RRULE (agenda do hábito).
     */
    public function linked(User $user, string $type, string $ref): array
    {
        // Chave repetida sem colchetes — http_build_query geraria
        // privateExtendedProperty[0], que o Google rejeita.
        $query = implode('&', [
            'privateExtendedProperty='.rawurlencode("lifegui_type={$type}"),
            'privateExtendedProperty='.rawurlencode("lifegui_ref={$ref}"),
            'maxResults=50',
        ]);

        $items = $this->guard($this->http($user)->get(self::BASE.'?'.$query))->json('items') ?? [];

        // status=cancelled aparece em masters apagados; não interessa.
        $items = array_values(array_filter($items, fn ($e) => ($e['status'] ?? '') !== 'cancelled'));

        return array_map(fn (array $event) => $this->normalize($event), $items);
    }

    public function get(User $user, string $eventId): array
    {
        $event = $this->guard($this->http($user)->get(self::BASE.'/'.rawurlencode($eventId)))->json();

        return $this->normalize($event);
    }

    /**
     * @param  array{title: string, description?: string, start: string, end: string, timezone?: string, rrule?: string|null, type: string, ref: string}  $data
     */
    public function create(User $user, array $data): array
    {
        $event = $this->guard($this->http($user)->post(self::BASE, $this->payload($data)))->json();

        return $this->normalize($event);
    }

    /**
     * @param  array{start?: string, end?: string, timezone?: string, rrule?: string|null}  $patch
     */
    public function update(User $user, string $eventId, array $patch): array
    {
        $event = $this->guard(
            $this->http($user)->patch(self::BASE.'/'.rawurlencode($eventId), $this->payload($patch)),
        )->json();

        return $this->normalize($event);
    }

    public function delete(User $user, string $eventId): void
    {
        $response = $this->http($user)->delete(self::BASE.'/'.rawurlencode($eventId));

        // 404/410: já não existe no Google — o estado desejado.
        if ($response->failed() && ! in_array($response->status(), [404, 410], true)) {
            throw CalendarApiException::fromResponse($response);
        }
    }

    /** Falha do Google vira exceção com a razão real (renderiza 502/404 no controller). */
    private function guard(\Illuminate\Http\Client\Response $response): \Illuminate\Http\Client\Response
    {
        if ($response->failed()) {
            throw CalendarApiException::fromResponse($response);
        }

        return $response;
    }

    private function http(User $user): PendingRequest
    {
        return Http::withToken($this->tokens->accessToken($user))->acceptJson();
    }

    /** Monta o corpo aceito pela API a partir do shape interno. */
    private function payload(array $data): array
    {
        $timezone = $data['timezone'] ?? config('app.timezone');
        $body = [];

        if (isset($data['title'])) {
            $body['summary'] = $data['title'];
        }
        if (isset($data['description'])) {
            $body['description'] = $data['description'];
        }
        if (isset($data['start'])) {
            $body['start'] = ['dateTime' => $data['start'], 'timeZone' => $timezone];
        }
        if (isset($data['end'])) {
            $body['end'] = ['dateTime' => $data['end'], 'timeZone' => $timezone];
        }
        // rrule presente (mesmo null) muda a recorrência; null limpa.
        if (array_key_exists('rrule', $data)) {
            $body['recurrence'] = $data['rrule'] ? [$data['rrule']] : [];
        }
        if (isset($data['type'], $data['ref'])) {
            $body['extendedProperties'] = ['private' => [
                'lifegui_type' => $data['type'],
                'lifegui_ref' => (string) $data['ref'],
            ]];
        }

        return $body;
    }

    private function normalize(array $event): array
    {
        $private = $event['extendedProperties']['private'] ?? [];
        $lifegui = isset($private['lifegui_type'])
            ? ['type' => $private['lifegui_type'], 'ref' => $private['lifegui_ref'] ?? '']
            : null;

        return [
            'id' => $event['id'],
            'title' => $event['summary'] ?? __('messages.calendar.untitled'),
            'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
            'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
            'all_day' => isset($event['start']['date']),
            'external' => $lifegui === null,
            'lifegui' => $lifegui,
            'recurring_event_id' => $event['recurringEventId'] ?? null,
            'recurrence' => $event['recurrence'] ?? null,
            'html_link' => $event['htmlLink'] ?? null,
        ];
    }
}
