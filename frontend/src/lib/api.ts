import axios from 'axios'
import i18n from '@/i18n'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

// O backend usa este header pra responder no idioma certo antes do login.
api.interceptors.request.use(config => {
  config.headers['Accept-Language'] = i18n.language
  return config
})

// Sanctum SPA: garante cookie CSRF antes de requests que mutam estado.
export async function csrf() {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}
