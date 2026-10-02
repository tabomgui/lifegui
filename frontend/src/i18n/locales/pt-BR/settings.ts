import type en from '../en/settings'
import type { Messages } from '../../types'

export default {
  language: {
    title: 'Idioma',
    description: 'Idioma da interface, das mensagens e das respostas dos assistentes de IA.',
    saved: 'Idioma atualizado',
    error: 'Não foi possível trocar o idioma',
  },
  calendar: {
    title: 'Google Calendar',
    description:
      'Agende estudos, hábitos e tarefas direto no seu calendário. O Google é a fonte ' +
      'da verdade — o lifegui lê e escreve na sua agenda, sem cópia local.',
    loading: 'Carregando…',
    connected: 'Conectado',
    connectedSince: 'desde {{date}}',
    disconnect: 'Desconectar',
    connect: 'Conectar Google Calendar',
    toast: {
      connected: 'Google Calendar conectado',
      mismatch: 'Use a mesma conta Google do seu login',
      connectError: 'Não foi possível conectar o Google Calendar',
      disconnected: 'Google Calendar desconectado',
      disconnectError: 'Não foi possível desconectar',
    },
  },
  capture: {
    title: 'Captura pelo celular',
    description:
      'Tokens pro Atalho do iOS mandarem conteúdo direto pro Inbox do Cérebro. ' +
      'Cada token só consegue capturar — nada mais.',
    defaultTokenName: 'Atalho iPhone',
    tokenNamePlaceholder: 'Nome do token',
    generate: 'Gerar token',
    copyNowWarning: 'Copie agora — ele não aparece de novo:',
    lastUsed: 'usado em {{date}}',
    neverUsed: 'nunca usado',
    revoke: 'Revogar {{name}}',
    toast: {
      createError: 'Não foi possível gerar o token',
      revoked: 'Token revogado',
      revokeError: 'Não foi possível revogar',
      copied: 'Token copiado',
      copyError: 'Selecione e copie manualmente',
    },
  },
  modules: {
    intro: 'Ative quais módulos aparecem na barra lateral.',
    loadError: 'Não foi possível carregar os módulos.',
    enable: 'Ativar {{label}}',
    toast: {
      enableError: 'Não foi possível ativar {{label}}.',
      disableError: 'Não foi possível desativar {{label}}.',
    },
  },
  vault: {
    title: 'Vaults do Cérebro',
    description: 'Pasta no servidor que contém um vault Obsidian por usuário',
    pathPattern: '{raiz}/{id do usuário}',
    scopeNote: 'Vale pra instância inteira.',
    pathLabel: 'Raiz dos vaults',
    pathDefault: 'padrão: {{path}}',
    pathExample: 'ex.: /vaults',
    yourVault: 'Seu vault:',
    rootExistsPrefix: 'A raiz existe, mas seu vault (',
    rootExistsSuffix: ') ainda não.',
    rootMissingPrefix: 'A raiz',
    rootMissingSuffix: 'não existe no servidor.',
    toast: {
      saved: 'Configuração salva',
      invalidPath: 'Caminho inválido: use um caminho absoluto (começando com /)',
    },
  },
} satisfies Messages<typeof en>
