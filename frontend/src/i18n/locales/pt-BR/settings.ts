import type en from '../en/settings'
import type { Messages } from '../../types'

export default {
  language: {
    title: 'Idioma',
    description: 'Idioma da interface, das mensagens e das respostas dos assistentes de IA.',
    saved: 'Idioma atualizado',
    error: 'Não foi possível trocar o idioma',
  },
} satisfies Messages<typeof en>
