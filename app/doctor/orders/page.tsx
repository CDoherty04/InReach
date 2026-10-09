import { payAction, startCheckoutAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { SubmitButton } from '@/components/SubmitButton'
import { GRANTS, formatMoney } from '@/lib/plan'
import { stripeConfigured } from '@/lib/payments'
import { confirmHospitalCheckout, listOrders } from '@/lib/store'

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

function paidLabel(method: string | null, last4: string | null): string {
  if (method === 'stripe') return 'Paid with Stripe'
  if (method === 'card' && last4) return `Paid with card ···· ${last4}`
  if (method === 'link') return 'Paid with Link'
  return 'Paid'
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paid?: string; checkout?: string; canceled?: string }>
}) {
  const query = await searchParams
  const stripeOn = stripeConfigured()
  let checkoutError: string | null = null
  if (query.checkout) {
    const result = await confirmHospitalCheckout(query.checkout)
    if ('error' in result) checkoutError = result.error
  }
  const orders = await listOrders()
  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>Hospital invoice</h1>
        <p>One flat {formatMoney(500000)} per year, per hospital. The family never pays for the text thread.</p>
        {query.error || checkoutError ? (
          <p className="error" role="alert">
            {query.error || checkoutError}
          </p>
        ) : null}
        {query.canceled ? <p className="hint">Checkout canceled. Nothing was charged.</p> : null}
        {query.paid || (query.checkout && !checkoutError) ? (
          <p className="ok">Payment recorded.</p>
        ) : null}
        {orders.length ? (
          orders.map((order) => (
            <article key={order.id} className="card">
              <h2>{order.hospitalName}</h2>
              <p>{order.description}</p>
              <p className="price">{formatMoney(order.amountCents)} / year</p>
              {order.status === 'pending' ? (
                stripeOn ? (
                  <form action={startCheckoutAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="hint">Stripe Checkout opens in test mode. Use card 4242 4242 4242 4242.</p>
                    <div className="pay-actions">
                      <SubmitButton>Pay {formatMoney(order.amountCents)} with Stripe</SubmitButton>
                    </div>
                    <Grants />
                  </form>
                ) : (
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
                )
              ) : (
                <p className="ok">
                  {paidLabel(order.method, order.last4)}
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
