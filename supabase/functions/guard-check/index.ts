import { corsHeaders } from '../_shared/cors.ts'
import { evaluateGuard } from '../_shared/harness/guard.ts'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const result = evaluateGuard({
      toolId: payload?.tool_id,
      requestedBy: payload?.requested_by,
    })

    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'guard-check failed' }, 500)
  }
})
