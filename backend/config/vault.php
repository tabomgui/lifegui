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

    // Definida só no deploy, nunca pela UI: vale pra todos os usuários.
    // Precisa estar em backend/.env (o artisan serve não repassa o environment
    // do compose). `?:` e não default do env(): VAULTS_PATH= vazio cai no fallback.
    'root' => env('VAULTS_PATH') ?: storage_path('vaults'),

];
