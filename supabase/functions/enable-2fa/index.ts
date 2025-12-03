import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TOTP, Secret } from 'https://esm.sh/otpauth@9.2.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, secret } = await req.json()
    
    console.log('Enable 2FA request received, token length:', token?.length, 'secret length:', secret?.length)

    if (!token || !secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token and secret are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the user from the request
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
      console.error('User auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, 'email:', user.email)

    // Verify the token
    try {
      const totp = new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
      })
      const validationResult = totp.validate({ token, window: 1 })
      const isValid = validationResult !== null
      
      console.log('TOTP validation result:', isValid, 'delta:', validationResult)

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (totpError) {
      console.error('TOTP validation error:', totpError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid secret format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the backup codes from setup (use maybeSingle to avoid error if no row)
    const { data: setupData, error: selectError } = await supabaseClient
      .from('profiles')
      .select('backup_codes')
      .eq('id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('Error fetching profile:', selectError)
    }

    console.log('Profile exists:', !!setupData, 'has backup codes:', !!setupData?.backup_codes)

    // Use upsert to ensure the profile exists and is updated
    const { data: updateData, error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        username: user.email || user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        two_factor_enabled: true,
        two_factor_secret: secret,
        backup_codes: setupData?.backup_codes || []
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save 2FA settings: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('2FA enabled successfully for user:', user.id, 'two_factor_enabled:', updateData?.two_factor_enabled)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Enable 2FA error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})