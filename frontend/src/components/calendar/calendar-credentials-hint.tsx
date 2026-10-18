import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { docsUrl } from '@/lib/docs'

/**
 * Mensagem exibida no lugar do botão "Conectar Google Calendar" quando a
 * instância não tem credenciais OAuth configuradas (evita o erro
 * "Missing required parameter: client_id" do Google).
 */
export function CalendarCredentialsHint({ className }: { className?: string }) {
  // useTranslation traduz os dois textos abaixo e, de quebra, inscreve o componente
  // em mudanças de idioma — sem isso docsUrl() (que lê i18n.language direto, sem
  // reatividade própria) ficaria preso no idioma da 1ª renderização.
  const { t } = useTranslation('calendar')
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {t('credentialsHint.text')}{' '}
      <a href={docsUrl('/self-hosting/google-calendar')} target="_blank" rel="noreferrer" className="underline">
        {t('credentialsHint.link')}
      </a>
    </p>
  )
}
