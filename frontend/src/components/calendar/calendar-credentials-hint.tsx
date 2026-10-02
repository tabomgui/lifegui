import { cn } from '@/lib/utils'
import { docsUrl } from '@/lib/docs'

/**
 * Mensagem exibida no lugar do botão "Conectar Google Calendar" quando a
 * instância não tem credenciais OAuth configuradas (evita o erro
 * "Missing required parameter: client_id" do Google).
 */
export function CalendarCredentialsHint({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Requer credenciais do Google nesta instância.{' '}
      <a href={docsUrl('/self-hosting/google-calendar')} target="_blank" rel="noreferrer" className="underline">
        Como configurar
      </a>
    </p>
  )
}
