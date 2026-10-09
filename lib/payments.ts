import 'server-only'
import type Stripe from 'stripe'

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

let client: Stripe | null = null

async function getStripe(): Promise<Stripe> {
  if (client) return client
  const { default: StripeClient } = await import('stripe')
  client = new StripeClient(process.env.STRIPE_SECRET_KEY as string)
  return client
}

export async function createCheckoutUrl(input: {
  orderId: string
  amountCents: number
  label: string
  baseUrl: string
}): Promise<string> {
  const stripe = await getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    submit_type: 'pay',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: input.label },
          unit_amount: input.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${input.baseUrl}/doctor/orders?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}/doctor/orders?canceled=1`,
    metadata: { orderId: input.orderId },
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return session.url
}

export async function checkoutOrderId(sessionId: string): Promise<string | null> {
  const stripe = await getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const paid =
    session.status === 'complete' &&
    (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
  if (!paid) return null
  return session.metadata?.orderId ?? null
}
