import { payInvoiceAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { formatMoney } from '@/lib/plan'
import { confirmHospitalCheckout, listOrders } from '@/lib/store'

export const metadata = { title: 'Invoice' }

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paid?: string; checkout?: string; canceled?: string }>
}) {
  const query = await searchParams
  let checkoutError: string | null = null
  if (query.checkout) {
    const result = await confirmHospitalCheckout(query.checkout)
    if ('error' in result) checkoutError = result.error
  }
  const orders = await listOrders()
  const order = orders.find((row) => row.status === 'pending') ?? null
  const paid = Boolean(
    query.paid || (query.checkout && !checkoutError) || orders.some((row) => row.status === 'paid'),
  )

  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>Hospital subscription</h1>
        <p>
          One flat {formatMoney(500000)} per year, per hospital. Caregiver reminders and the home page stay free for
          families.
        </p>
        {query.error || checkoutError ? (
          <p className="error" role="alert">
            {query.error || checkoutError}
          </p>
        ) : null}
        {query.canceled ? <p className="hint">Checkout canceled.</p> : null}
        {paid ? (
          <p className="ok">Payment recorded.</p>
        ) : order ? (
          <form action={payInvoiceAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn primary">
              Pay {formatMoney(order.amountCents)}
            </button>
          </form>
        ) : (
          <p className="hint">Submit a discharge to open checkout.</p>
        )}
      </div>
    </main>
  )
}
