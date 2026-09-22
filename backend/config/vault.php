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

    'root' => env('VAULTS_PATH', storage_path('vaults')),

];
