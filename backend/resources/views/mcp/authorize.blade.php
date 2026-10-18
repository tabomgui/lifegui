<!DOCTYPE html>
{{-- Consent OAuth do servidor MCP. Sem @vite: o backend não tem build de
     assets (o SPA é separado) — CSS inline, dark, alinhado ao tema do app. --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('messages.consent.title') }} — lifegui</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <style>
        :root { color-scheme: dark; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            background: hsl(0 0% 6%); color: hsl(0 0% 95%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .card {
            width: 100%; max-width: 400px; background: hsl(0 0% 9%);
            border: 1px solid hsl(0 0% 18%); border-radius: 12px; padding: 28px;
        }
        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .brand img { width: 28px; height: 28px; border-radius: 6px; }
        .brand span { font-weight: 600; font-size: 15px; }
        h1 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
        p.sub { font-size: 13px; color: hsl(0 0% 62%); line-height: 1.5; margin-bottom: 18px; }
        .client { font-weight: 600; color: hsl(0 0% 95%); }
        .user {
            font-size: 12px; color: hsl(0 0% 62%); border: 1px solid hsl(0 0% 18%);
            border-radius: 8px; padding: 8px 12px; margin-bottom: 20px;
        }
        .actions { display: flex; gap: 10px; }
        .actions form { flex: 1; }
        button {
            width: 100%; height: 40px; border-radius: 8px; font-size: 14px; font-weight: 500;
            cursor: pointer; border: 1px solid transparent;
        }
        .approve { background: hsl(0 0% 95%); color: hsl(0 0% 8%); }
        .approve:hover { background: hsl(0 0% 85%); }
        .deny { background: transparent; color: hsl(0 0% 80%); border-color: hsl(0 0% 22%); }
        .deny:hover { background: hsl(0 0% 14%); }
    </style>
</head>
<body>
    <main class="card">
        <div class="brand">
            <img src="/favicon.svg" alt="lifegui">
            <span>lifegui</span>
        </div>

        <h1>{{ __('messages.consent.title') }}</h1>
        <p class="sub">
            {!! __('messages.consent.wants_to_connect', ['client' => '<span class="client">'.e($client->name).'</span>']) !!}
        </p>

        <div class="user">{{ __('messages.consent.connecting_as', ['name' => $user->name, 'email' => $user->email]) }}</div>

        <div class="actions">
            <form method="POST" action="{{ route('passport.authorizations.deny') }}">
                @csrf
                @method('DELETE')
                <input type="hidden" name="state" value="{{ request('state') }}">
                <input type="hidden" name="client_id" value="{{ $client->id }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button type="submit" class="deny">{{ __('messages.consent.deny') }}</button>
            </form>
            <form method="POST" action="{{ route('passport.authorizations.approve') }}">
                @csrf
                <input type="hidden" name="state" value="{{ request('state') }}">
                <input type="hidden" name="client_id" value="{{ $client->id }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button type="submit" class="approve">{{ __('messages.consent.approve') }}</button>
            </form>
        </div>
    </main>
</body>
</html>
