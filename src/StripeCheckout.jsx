import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from './supabase.js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '')

const T = {
  card: '#f4f8f1', border: '#c4d9b4', green: '#228B22', greenHi: '#1a5c1a',
  red: '#b02020', cream: '#1a3820', textMid: '#4a6a4a', textDim: '#8aaa8a',
  sans: "'DM Sans', sans-serif", font: "'Lora', Georgia, serif",
}

const CARD_STYLE = {
  style: {
    base: {
      color: '#1c2c1c',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      '::placeholder': { color: '#8aaa8a' },
    },
    invalid: { color: '#b02020' },
  },
}

// Inner form — must live inside <Elements>
const PaymentForm = ({ clientSecret, orderPayload, insertOrder, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [cardError, setCardError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setCardError('')

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    })

    if (error) {
      setCardError(error.message ?? 'Erreur de paiement')
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      await insertOrder({
        ...orderPayload,
        pay_status: 'payé',
        stripe_payment_intent_id: paymentIntent.id,
        payment_gateway: 'stripe',
      })
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay}>
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, color: T.textMid, fontFamily: T.sans, marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Informations de carte
        </label>
        <div style={{ background: '#fff', border: `1.5px solid ${cardError ? T.red : T.border}`, borderRadius: 10, padding: '13px 14px', transition: 'border-color .2s' }}>
          <CardElement options={CARD_STYLE} />
        </div>
        {cardError && (
          <div style={{ color: T.red, fontSize: 12, fontFamily: T.sans, marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
            ⚠️ {cardError}
          </div>
        )}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 13px', marginBottom: 18, color: T.textMid, fontSize: 11, fontFamily: T.sans, display: 'flex', alignItems: 'center', gap: 6 }}>
        🔒 Paiement sécurisé par Stripe · Aucune donnée de carte stockée
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          style={{ background: 'transparent', color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 9, padding: '10px 18px', fontFamily: T.sans, fontSize: 13, cursor: 'pointer', opacity: processing ? 0.5 : 1 }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          style={{
            background: `linear-gradient(135deg,${T.green},${T.greenHi})`,
            color: '#fff', border: 'none', borderRadius: 9, padding: '10px 24px',
            fontFamily: T.sans, fontSize: 14, fontWeight: 700,
            cursor: (!stripe || processing) ? 'not-allowed' : 'pointer',
            opacity: (!stripe || processing) ? 0.7 : 1, transition: 'opacity .2s',
          }}
        >
          {processing ? 'Traitement…' : `Payer ${Number(orderPayload.total || 0).toFixed(2)} $`}
        </button>
      </div>
    </form>
  )
}

// Modal wrapper: fetches PaymentIntent client_secret then renders Elements
export const StripeCheckout = ({ total, orderPayload, insertOrder, onSuccess, onClose }) => {
  const [clientSecret, setClientSecret] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: total,
            metadata: {
              client_id: orderPayload.client_id ?? '',
              client_name: orderPayload.client_name ?? '',
              client_email: orderPayload.client_email ?? '',
            },
          },
        })
        if (error || data?.error) throw new Error(error?.message || data?.error)
        setClientSecret(data.client_secret)
      } catch (err) {
        setFetchError(err.message || 'Impossible de démarrer le paiement')
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: T.font, color: T.cream, fontSize: 18, fontWeight: 700 }}>💳 Paiement sécurisé</div>
            <div style={{ fontFamily: T.sans, color: T.textMid, fontSize: 12, marginTop: 3 }}>
              Total: <strong style={{ color: T.greenHi }}>{Number(total || 0).toFixed(2)} $</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.textMid, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '28px 0', fontFamily: T.sans, color: T.textMid, fontSize: 13 }}>
            Chargement du formulaire de paiement…
          </div>
        )}

        {fetchError && (
          <div style={{ color: T.red, fontFamily: T.sans, fontSize: 13, background: '#fde8e8', border: `1px solid ${T.red}44`, borderRadius: 8, padding: '12px 14px' }}>
            ⚠️ {fetchError}
            <div style={{ marginTop: 8 }}>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.red, textDecoration: 'underline', cursor: 'pointer', fontFamily: T.sans, fontSize: 12 }}>Fermer</button>
            </div>
          </div>
        )}

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              orderPayload={orderPayload}
              insertOrder={insertOrder}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}
