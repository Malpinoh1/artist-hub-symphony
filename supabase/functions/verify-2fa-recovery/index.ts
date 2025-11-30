import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, recoveryCode } = await req.json()

    if (!email || !recoveryCode) {
      return new Response(
        JSON.stringify({ error: 'Email and recovery code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Find user by email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, two_factor_recovery_code, two_factor_recovery_expires, two_factor_enabled')
      .eq('username', email.toLowerCase().trim())
      .maybeSingle()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Invalid recovery code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if 2FA is enabled
    if (!profile.two_factor_enabled) {
      return new Response(
        JSON.stringify({ error: '2FA is not enabled for this account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if recovery code exists and matches
    if (!profile.two_factor_recovery_code || profile.two_factor_recovery_code !== recoveryCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid recovery code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code has expired
    if (!profile.two_factor_recovery_expires || new Date(profile.two_factor_recovery_expires) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Recovery code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Disable 2FA and clear recovery code
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
        two_factor_recovery_code: null,
        two_factor_recovery_expires: null
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error disabling 2FA:', updateError)
      throw updateError
    }

    console.log('2FA disabled successfully for user:', profile.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Two-factor authentication has been disabled successfully. You can now log in with your password only.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
