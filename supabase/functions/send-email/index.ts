const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailRecipient = {
  email: string
  name?: string
  text: string
  html: string
}

type EmailRequest = {
  type?: string
  subject: string
  fromName?: string
  recipients: EmailRecipient[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Refuto La Ferme Urbaine <onboarding@resend.dev>'

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY secret in Supabase.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const payload = await req.json() as EmailRequest

    if (!payload.subject || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing subject or recipients.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const results = []

    for (const recipient of payload.recipients) {
      if (!recipient.email || !recipient.email.includes('@')) {
        results.push({
          email: recipient.email,
          ok: false,
          error: 'Invalid email',
        })
        continue
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject: payload.subject,
          html: recipient.html,
          text: recipient.text,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        results.push({
          email: recipient.email,
          ok: false,
          error: result?.message || result?.error || 'Resend failed',
        })
      } else {
        results.push({
          email: recipient.email,
          ok: true,
          id: result?.id,
        })
      }
    }

    const failed = results.filter(r => !r.ok)

    return new Response(
      JSON.stringify({
        ok: failed.length === 0,
        sent: results.filter(r => r.ok).length,
        failed: failed.length,
        results,
      }),
      {
        status: failed.length === results.length ? 500 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || 'Unknown send-email error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
