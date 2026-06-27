import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface AiTask {
  id: string;
  emoji: string;
  title: string;
  description: string;
  minutes: number;
  effort: 'low' | 'medium' | 'high';
  category: 'outside' | 'social' | 'fitness' | 'mind' | 'tidy' | 'create' | 'care';
  tags: string[];
  duration: string;
  timeOfDay: string[];
  ai: true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prefs = {}, energy = 5, recentTitles = [] } = await req.json().catch(() => ({}));

    const system = `You generate small, doable, kind suggestions for an app called Evora.
Tasks should feel personal, specific, and never overwhelming.
Return strictly valid JSON matching the schema. Pick effort to match the user's energy:
- energy 1-3: effort=low, minutes 1-3
- energy 4-6: effort=low or medium, minutes 3-10
- energy 7-10: effort=medium or high, minutes 10-25
Avoid anything in the user's avoid list. Prefer their interests and goals. Do not repeat the recent task titles. Use commas, never em dashes.`;

    const user = `User preferences:
- interests: ${(prefs.interests || []).join(', ') || 'none'}
- goals: ${(prefs.goals || []).join(', ') || 'none'}
- preferred task types: ${(prefs.preferredTypes || []).join(', ') || 'any'}
- struggles: ${(prefs.struggles || []).join(', ') || 'none'}
- avoid: ${(prefs.avoid || []).join(', ') || 'none'}

Current energy: ${energy}/10
Recently shown (do not repeat): ${recentTitles.join('; ') || 'none'}

Generate 4 fresh tasks tailored to this user.`;

    const schema = {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              emoji: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              minutes: { type: 'number' },
              effort: { type: 'string', enum: ['low', 'medium', 'high'] },
              category: {
                type: 'string',
                enum: ['outside', 'social', 'fitness', 'mind', 'tidy', 'create', 'care'],
              },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['emoji', 'title', 'description', 'minutes', 'effort', 'category'],
          },
        },
      },
      required: ['tasks'],
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'emit_tasks',
              description: 'Return the personalized tasks.',
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'emit_tasks' } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', status: aiRes.status, body }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    const rawTasks = Array.isArray(args.tasks) ? args.tasks : [];

    const now = Date.now();
    const tasks: AiTask[] = rawTasks.slice(0, 6).map((t: any, i: number) => {
      const minutes = Math.max(1, Math.min(30, Number(t.minutes) || 5));
      return {
        id: `ai-${now}-${i}`,
        emoji: String(t.emoji || '✨').slice(0, 4),
        title: String(t.title || '').slice(0, 120),
        description: String(t.description || '').slice(0, 280),
        minutes,
        effort: ['low', 'medium', 'high'].includes(t.effort) ? t.effort : 'low',
        category: t.category || 'mind',
        tags: Array.isArray(t.tags) ? t.tags.slice(0, 4).map(String) : [],
        duration: minutes < 1 ? '< 1 min' : `${minutes} min`,
        timeOfDay: ['morning', 'midday', 'evening', 'night'],
        ai: true,
      };
    });

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
