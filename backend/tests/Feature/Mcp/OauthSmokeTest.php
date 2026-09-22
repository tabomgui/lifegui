<?php

test('discovery OAuth responde com endpoints', function () {
    $this->getJson('/.well-known/oauth-authorization-server')
        ->assertOk()
        ->assertJsonStructure(['issuer', 'authorization_endpoint', 'token_endpoint', 'registration_endpoint']);
});

test('endpoint MCP exige token', function () {
    $this->postJson('/mcp', ['jsonrpc' => '2.0', 'method' => 'ping', 'id' => 1])
        ->assertStatus(401);
});
