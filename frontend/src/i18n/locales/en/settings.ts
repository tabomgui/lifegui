export default {
  language: {
    title: 'Language',
    description: 'Language of the interface, messages and AI assistant answers.',
    saved: 'Language updated',
    error: 'Could not change the language',
  },
  calendar: {
    title: 'Google Calendar',
    description:
      'Schedule studies, habits and tasks straight into your calendar. Google is the source ' +
      'of truth — lifegui reads and writes to your calendar, with no local copy.',
    connected: 'Connected',
    connectedSince: 'since {{date}}',
    disconnect: 'Disconnect',
    connect: 'Connect Google Calendar',
    toast: {
      connected: 'Google Calendar connected',
      mismatch: 'Use the same Google account as your login',
      connectError: 'Could not connect Google Calendar',
      disconnected: 'Google Calendar disconnected',
      disconnectError: 'Could not disconnect',
    },
  },
  capture: {
    title: 'Mobile capture',
    description:
      'Tokens for the iOS Shortcut to send content straight to the Brain inbox. ' +
      'Each token can only capture — nothing else.',
    defaultTokenName: 'iPhone Shortcut',
    tokenNamePlaceholder: 'Token name',
    generate: 'Generate token',
    copyNowWarning: "Copy it now — it won't show again:",
    lastUsed: 'last used {{date}}',
    neverUsed: 'never used',
    revoke: 'Revoke {{name}}',
    toast: {
      createError: 'Could not generate the token',
      revoked: 'Token revoked',
      revokeError: 'Could not revoke',
      copied: 'Token copied',
      copyError: 'Select and copy it manually',
    },
  },
  modules: {
    intro: 'Choose which modules appear in the sidebar.',
    loadError: 'Could not load the modules.',
    enable: 'Enable {{label}}',
    toast: {
      enableError: 'Could not enable {{label}}.',
      disableError: 'Could not disable {{label}}.',
    },
  },
  vault: {
    title: 'Brain vaults',
    description: 'Server folder that holds one Obsidian vault per user',
    pathPattern: '{root}/{user id}',
    scopeNote: 'Set by the server administrator (VAULTS_PATH).',
    yourVault: 'Your vault:',
    rootExistsPrefix: "The root exists, but your vault (",
    rootExistsSuffix: ") doesn't exist yet.",
    rootMissingPrefix: 'The root',
    rootMissingSuffix: "doesn't exist on the server.",
  },
} as const
