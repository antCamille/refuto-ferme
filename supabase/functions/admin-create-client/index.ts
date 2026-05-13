import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, password, phone, address, avatar, role, position, hourly_rate } = await req.json()

    if (!name || !email || !password) {
      throw new Error('Nom, courriel et mot de passe requis')
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    // 2. Create profile in users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        name,
        email,
        phone: phone || null,
        address: address || null,
        role: role || 'client',
        avatar: avatar || '👤',
        position: position || null,
        hourly_rate: hourly_rate || null,
      })
      .select()
      .single()
    if (profileError) {
      // Roll back auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return new Response(JSON.stringify({ user: profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
