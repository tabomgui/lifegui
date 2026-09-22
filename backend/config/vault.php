<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Raiz dos vaults Obsidian
    |--------------------------------------------------------------------------
    |
    | Diretório que contém um vault por usuário ({root}/{user_id}). Os arquivos
    | .md dentro dele são a fonte da verdade do módulo Cérebro; o app lê e
    | escreve direto no filesystem, sem espelho no banco.
    |
    */

    // `?:` e não default do env(): VAULTS_PATH= vazio no .env deve cair no
    // fallback. E o valor PRECISA estar no .env (não só no environment do
    // container): `artisan serve` repassa ao filho apenas o que o Dotenv
    // carregou — env vars do container somem no processo que serve HTTP.
    'root' => env('VAULTS_PATH') ?: storage_path('vaults'),

];
