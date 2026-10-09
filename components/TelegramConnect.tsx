import { L } from '@/components/L'

export function TelegramConnect({
  connectUrl,
  linked,
}: {
  connectUrl: string | null
  linked: boolean
}) {
  if (!connectUrl) return null
  return (
    <section className="card" aria-labelledby="telegram-heading">
      <h2 id="telegram-heading">
        <L en="Telegram reminders" es="Recordatorios por Telegram" />
      </h2>
      {linked ? (
        <p className="ok">
          <L en="This chart is linked to Telegram." es="Este plan está vinculado a Telegram." />
        </p>
      ) : (
        <p>
          <L
            en="For the demo, message @InReach72HoursBot once with /start — every reminder uses that Telegram chat."
            es="Para la demo, envíe /start a @InReach72HoursBot una vez; todos los recordatorios van a ese chat."
          />
        </p>
      )}
      <p>
        <a href={connectUrl} target="_blank" rel="noreferrer">
          <L en={linked ? 'Open Telegram bot' : 'Connect Telegram'} es={linked ? 'Abrir bot de Telegram' : 'Conectar Telegram'} />
        </a>
      </p>
    </section>
  )
}
