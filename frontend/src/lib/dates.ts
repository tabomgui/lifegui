// Data-calendário LOCAL no formato 'Y-m-d'. Nunca usar `toISOString().slice(0, 10)`:
// é UTC e, em São Paulo, depois das 21h já devolve o dia seguinte.
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
