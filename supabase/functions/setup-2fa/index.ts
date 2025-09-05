import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TOTP, Secret } from 'https://esm.sh/otpauth@9.2.3'
import { toDataURL } from 'https://esm.sh/qrcode@1.5.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a secret
    const secret = new Secret().base32
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    // Create QR code URL
    const serviceName = 'Malpinoh Distribution'
    const accountName = user.email || user.id
    const totp = new TOTP({
      issuer: serviceName,
      label: accountName,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    })
    const otpauthUrl = totp.toString()
    const qrCodeUrl = await toDataURL(otpauthUrl)

    // Store backup codes temporarily (they'll be saved when 2FA is enabled)
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ backup_codes: backupCodes })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error storing backup codes:', updateError);
    }

    return new Response(
      JSON.stringify({
        secret,
        qrCodeUrl,
        backupCodes,
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