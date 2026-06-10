import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { priceId, environment } = await req.json();
    const env = (environment === 'live' ? 'live' : 'sandbox') as PaddleEnv;
    if (!priceId || typeof priceId !== 'string') {
      return new Response(JSON.stringify({ error: 'priceId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();
    if (!data.data?.length) {
      return new Response(JSON.stringify({ error: 'Price not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ paddleId: data.data[0].id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('get-paddle-price unexpected error', e);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
