import { payAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { SubmitButton } from '@/components/SubmitButton'
import { VolumeMath } from '@/components/VolumeMath'
import { GRANTS, formatMoney } from '@/lib/plan'
import { listOrders } from '@/lib/store'

export const metadata = { title: 'Invoice' }

function Grants() {
  return (
    <div className="grants">
      <p>Grant and coverage applications</p>
      <ul>
        {GRANTS.map((grant) => (
          <li key={grant.href}>
            <a href={grant.href} target="_blank" rel="noreferrer">
              {grant.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ error?: string; paid?: string }> }) {
  const query = await searchParams
  const orders = await listOrders()
  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>Hospital invoice</h1>
        <p>One flat rate per discharge. The family does not pay for the text thread.</p>
        <VolumeMath />
        {query.error ? (
          <p className="error" role="alert">
            {query.error}
          </p>
        ) : null}
        {query.paid ? <p className="ok">Payment recorded. Nothing was sent to a bank.</p> : null}
        {orders.length ? (
          orders.map((order) => (
            <article key={order.id} className="card">
              <h2>{order.patientName}</h2>
              <p>{order.hospitalName}</p>
              <p>{order.description}</p>
              <p className="price">{formatMoney(order.amountCents)}</p>
              {order.status === 'pending' ? (
                <form action={payAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <p className="hint">Mock checkout. This test card is prefilled. Nothing is charged.</p>
                  <div className="grid-2">
                    <label>
                      Card number
                      <input name="card" inputMode="numeric" autoComplete="off" defaultValue="4242 4242 4242 4242" />
                    </label>
                    <label>
                      Expiration
                      <input name="expiry" autoComplete="off" defaultValue="12/28" />
                    </label>
                    <label>
                      Security code
                      <input name="cvc" autoComplete="off" defaultValue="123" />
                    </label>
                  </div>
                  <div className="pay-actions">
                    <SubmitButton name="method" value="card">
                      Pay with card
                    </SubmitButton>
                    <SubmitButton name="method" value="link" tone="ghost">
                      Pay with Link
                    </SubmitButton>
                  </div>
                  <Grants />
                </form>
              ) : (
                <p className="ok">
                  Paid{order.method === 'card' && order.last4 ? ` with card ···· ${order.last4}` : order.method === 'link' ? ' with Link' : ''}
                  {order.paidStamp ? ` · ${order.paidStamp}` : ''}.
                </p>
              )}
            </article>
          ))
        ) : (
          <p>Submit a discharge to create an invoice.</p>
        )}
      </div>
    </main>
  )
}
