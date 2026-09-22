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

    // FALLBACK apenas: a raiz efetiva vem de app_settings (vaults_path),
    // editável em Configurações. Este valor só vale sem nada salvo no banco.
    // `?:` e não default do env(): VAULTS_PATH= vazio deve cair no fallback.
    'root' => env('VAULTS_PATH') ?: storage_path('vaults'),

];
