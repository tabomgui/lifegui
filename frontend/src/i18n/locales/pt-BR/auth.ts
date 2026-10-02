import type en from '../en/auth'
import type { Messages } from '../../types'

export default {
  fields: {
    name: 'Nome',
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
  },
  login: {
    title: 'Entrar no lifegui',
    submit: 'Entrar',
    google: 'Entrar com Google',
    noAccount: 'Não tem conta?',
    registerLink: 'Cadastre-se',
    invalidCredentials: 'Credenciais inválidas',
    registrationClosed: 'Esta conta Google não está cadastrada nesta instância.',
  },
  register: {
    title: 'Criar conta',
    submit: 'Cadastrar',
    haveAccount: 'Já tem conta?',
    loginLink: 'Entrar',
    error: 'Não foi possível cadastrar',
    disabled: {
      title: 'Cadastro desativado',
      description: 'Esta instância não aceita novas contas. Fale com quem administra o lifegui.',
      backToLogin: 'Voltar para o login',
    },
  },
  setup: {
    title: 'Configurar o lifegui',
    description: 'Crie a conta principal desta instância.',
    submit: 'Criar conta',
    error: 'Não foi possível criar a conta',
  },
} satisfies Messages<typeof en>
