/**
 * Cloudflare Worker — Proxy API (Anthropic + Perplexity)
 *
 * Routes :
 *   POST /anthropic/*  → https://api.anthropic.com/*   (clé : ANTHROPIC_API_KEY secret)
 *   POST /perplexity/* → https://api.perplexity.ai/*   (clé : PERPLEXITY_API_KEY secret)
 *
 * Sécurité :
 *   - CORS restreint aux origines autorisées uniquement
 *   - Clés jamais exposées au browser
 *   - Aucune donnée stockée côté worker
 *
 * Déploiement :
 *   npx wrangler deploy
 *   npx wrangler secret put ANTHROPIC_API_KEY
 *   npx wrangler secret put PERPLEXITY_API_KEY
 */

const ALLOWED_ORIGINS = [
  'https://danforthhh.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : null
  if (!allowed) return null
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': [
      'Content-Type',
      'anthropic-version',
      'anthropic-beta',
    ].join(', '),
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin)

    // Rejeter les origines inconnues (sauf appels directs sans Origin, ex: curl)
    if (!cors && origin) {
      return new Response('Forbidden — origin not allowed', { status: 403 })
    }

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors ?? {} })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)
    const path = url.pathname
    let targetUrl
    const authHeaders = {}

    if (path.startsWith('/anthropic/')) {
      targetUrl = 'https://api.anthropic.com' + path.replace('/anthropic', '')
      authHeaders['x-api-key'] = env.ANTHROPIC_API_KEY
      authHeaders['anthropic-version'] = '2023-06-01'
      // Transférer anthropic-beta si présent (pour prompt caching, thinking, etc.)
      const beta = request.headers.get('anthropic-beta')
      if (beta) authHeaders['anthropic-beta'] = beta

    } else if (path.startsWith('/perplexity/')) {
      targetUrl = 'https://api.perplexity.ai' + path.replace('/perplexity', '')
      authHeaders['Authorization'] = `Bearer ${env.PERPLEXITY_API_KEY}`

    } else {
      return new Response('Not found', { status: 404 })
    }

    // Construire les headers vers l'API cible
    const forwardHeaders = new Headers({ 'Content-Type': 'application/json' })
    for (const [k, v] of Object.entries(authHeaders)) forwardHeaders.set(k, v)

    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: request.body,
    })

    // Construire la réponse avec CORS
    const responseHeaders = new Headers(apiResponse.headers)
    if (cors) {
      for (const [k, v] of Object.entries(cors)) responseHeaders.set(k, v)
    }

    // Passer le stream tel quel (supporte le streaming SSE d'Anthropic)
    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    })
  },
}
