export default {
  fields: {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
  },
  login: {
    title: 'Sign in to lifegui',
    submit: 'Sign in',
    google: 'Sign in with Google',
    noAccount: "Don't have an account?",
    registerLink: 'Sign up',
    invalidCredentials: 'Invalid credentials',
    registrationClosed: 'This Google account is not registered on this instance.',
  },
  register: {
    title: 'Create account',
    submit: 'Sign up',
    haveAccount: 'Already have an account?',
    loginLink: 'Sign in',
    error: 'Could not sign up',
    disabled: {
      title: 'Registration disabled',
      description: 'This instance is not accepting new accounts. Contact your lifegui administrator.',
      backToLogin: 'Back to login',
    },
  },
  setup: {
    title: 'Set up lifegui',
    description: 'Create the main account for this instance.',
    submit: 'Create account',
    error: 'Could not create the account',
  },
} as const
