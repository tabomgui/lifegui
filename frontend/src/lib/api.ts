import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

// Sanctum SPA: garante cookie CSRF antes de requests que mutam estado.
export async function csrf() {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}
