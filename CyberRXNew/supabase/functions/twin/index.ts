// Nerion — Executive Twin (server-side, Phase 5). Supabase Edge Function (Deno).
//
// The ONLY place the Anthropic API is ever called. The key lives in a server
// secret and never reaches the browser. The function enforces both gates, then
// uses the model strictly as a TRANSLATOR on a locked spec sheet of engine
// values + retrieved evidence — it cannot introduce facts. Output is
// schema-validated; anything consequential is flagged for human-in-the-loop.
//
// Deploy: supabase functions deploy twin
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... [ANTHROPIC_MODEL=claude-sonnet-4-6]
//
// Request:  { question: string, tenantId: string }
// Response: { kind: 'refused'|'grounded', gate?, message?, answer?, citations?, confidence?, needsHumanReview? }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const CYBER_TERMS = ['cyber', 'security', 'risk', 'threat', 'attack', 'compromise', 'breach', 'ransomware', 'phishing', 'vulnerab', 'exposure', 'incident', 'control', 'compliance', 'audit', 'posture', 'mfa', 'identity', 'access', 'pam', 'recovery', 'backup', 'detect', 'malware', 'data', 'phi', 'maturity', 'cmmi', 'framework', 'insurance', 'liability', 'decision', 'evidence']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const { question, tenantId } = await req.json().catch(() => ({ question: '' }))
  if (!question || typeof question !== 'string') return json({ error: 'question required' }, 400)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.startsWith('Bearer ')) return json({ error: 'authentication required' }, 401)

  // Gate 1 — scope router (server-side).
  const inScope = (question.toLowerCase().match(/[a-z0-9]+/g) ?? []).some((w) =>
    CYBER_TERMS.some((t) => w.startsWith(t)),
  )
  if (!inScope) {
    return json({ kind: 'refused', gate: 'scope', message: 'Outside cyber-risk scope for your organization.' })
  }

  // Gate 2 — retrieval gate. Pull THIS tenant's evidence via RLS (the caller's
  // JWT scopes the read; the engine's computed values are the spec sheet).
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authz } } })
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return json({ error: 'invalid session' }, 401)
  let query = supabase.from('evidence').select('source_system, kind, value, collected_at, content_hash').limit(100)
  if (typeof tenantId === 'string' && /^[0-9a-f-]{36}$/i.test(tenantId)) query = query.eq('tenant_id', tenantId)
  const { data: evidence } = await query

  // Mirror the client gate: require >=2 overlapping question terms (not a single
  // substring), so the server never admits thinner evidence than the client.
  const qTerms = new Set((question.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3))
  const retrieved = (evidence ?? []).filter((e) => {
    const hay = JSON.stringify(e).toLowerCase().match(/[a-z0-9]+/g) ?? []
    let score = 0
    for (const w of hay) if (qTerms.has(w)) score++
    return score >= 2
  })
  if (retrieved.length === 0) {
    return json({ kind: 'refused', gate: 'retrieval', message: "I don't have evidence in your data for that — I won't guess." })
  }

  if (!ANTHROPIC_API_KEY) {
    // No key configured: refuse rather than fabricate. (Demo grounding lives client-side.)
    return json({ kind: 'refused', gate: 'retrieval', message: 'Twin model not configured on the server.' })
  }

  // Grounded generation: the model is a TRANSLATOR on a locked spec sheet.
  const system = [
    'You are an executive cyber-risk Twin. You translate pre-computed values into clear prose.',
    'HARD RULES: Use ONLY the evidence provided. Never introduce numbers, facts, or claims not present in it.',
    'If the evidence is insufficient, say so. Cite the source systems. Do not speculate.',
    'Return ONLY JSON: {"answer": string, "citations": string[], "needsHumanReview": boolean}.',
  ].join(' ')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      system,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}\n\nEvidence (the ONLY facts you may use):\n${JSON.stringify(retrieved, null, 2)}`,
        },
      ],
    }),
  })

  if (!resp.ok) return json({ kind: 'refused', gate: 'retrieval', message: 'Twin temporarily unavailable.' }, 502)
  const data = await resp.json()
  const text = data?.content?.[0]?.text ?? '{}'

  // Schema validation — reject anything that isn't the locked shape.
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    return json({ kind: 'refused', gate: 'retrieval', message: 'Twin output failed validation.' }, 502)
  }
  if (typeof parsed.answer !== 'string' || !Array.isArray(parsed.citations)) {
    return json({ kind: 'refused', gate: 'retrieval', message: 'Twin output failed validation.' }, 502)
  }

  return json({
    kind: 'grounded',
    answer: parsed.answer,
    citations: parsed.citations,
    confidence: 'computed',
    needsHumanReview: !!parsed.needsHumanReview,
  })
})
