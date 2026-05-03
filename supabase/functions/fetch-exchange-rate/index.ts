import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchUsdNgn(): Promise<number | null> {
  // Primary: exchangerate.host
  try {
    const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=NGN')
    const j = await r.json()
    const rate = Number(j?.rates?.NGN)
    if (rate && isFinite(rate) && rate > 0) return rate
  } catch (e) { console.warn('exchangerate.host failed', e) }
  // Fallback: open.er-api.com
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD')
    const j = await r.json()
    const rate = Number(j?.rates?.NGN)
    if (rate && isFinite(rate) && rate > 0) return rate
  } catch (e) { console.warn('open.er-api.com failed', e) }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const rate = await fetchUsdNgn()
    if (!rate) {
      return new Response(JSON.stringify({ error: 'Failed to fetch FX rate' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({ base: 'USD', quote: 'NGN', rate, source: 'exchangerate.host' })
      .select()
      .maybeSingle()

    if (error) throw error

    return new Response(JSON.stringify({ rate, fetched_at: data?.fetched_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('fetch-exchange-rate error', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
