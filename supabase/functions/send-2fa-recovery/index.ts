import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Find user by email
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, two_factor_enabled')
      .eq('username', email.toLowerCase().trim())
      .maybeSingle()

    if (profileError || !profiles) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists with 2FA enabled, a recovery email has been sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only send email if 2FA is actually enabled
    if (!profiles.two_factor_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists with 2FA enabled, a recovery email has been sent.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a recovery code (6-digit random number)
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store recovery code in database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        two_factor_recovery_code: recoveryCode,
        two_factor_recovery_expires: expiresAt.toISOString()
      })
      .eq('id', profiles.id)

    if (updateError) {
      console.error('Error storing recovery code:', updateError)
      throw updateError
    }

    // Send recovery email
    const emailResponse = await resend.emails.send({
      from: 'MALPINOHdistro Security <security@malpinohdistro.com>',
      to: [email],
      subject: '2FA Recovery Code - MALPINOHdistro',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">MALPINOHdistro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Two-Factor Authentication Recovery</p>
            </div>
            
            <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello ${profiles.full_name || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                We received a request to recover your two-factor authentication settings. Use the code below to disable 2FA and regain access to your account:
              </p>
              
              <div style="background: #f3f4f6; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your recovery code:</p>
                <p style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0; font-family: monospace;">
                  ${recoveryCode}
                </p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>⚠️ Important:</strong> This code expires in 15 minutes and can only be used once.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                After using this code to disable 2FA, we recommend:
              </p>
              
              <ul style="font-size: 14px; color: #666; margin-bottom: 25px;">
                <li style="margin-bottom: 8px;">Setting up a new authenticator app</li>
                <li style="margin-bottom: 8px;">Storing your new backup codes in a safe place</li>
                <li>Reviewing your account activity for any suspicious logins</li>
              </ul>
              
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>🔒 Security Notice:</strong> If you didn't request this recovery code, please ignore this email and ensure your account password is secure. Someone may be trying to access your account.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                Best regards,<br>
                The MALPINOHdistro Security Team
              </p>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px;">
                MALPINOHdistro - Music Distribution Platform<br>
                <a href="https://www.malpinohdistro.com.ng" style="color: #667eea; text-decoration: none;">www.malpinohdistro.com.ng</a>
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error)
      throw emailResponse.error
    }

    console.log('Recovery email sent successfully to:', email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account exists with 2FA enabled, a recovery email has been sent.'
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
