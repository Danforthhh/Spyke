// RÔLE ARCHITECTURAL : SPOKE 2 (Sentiment Analyst)
// Inputs  : competitor_name, apiKey
// Outputs : SentimentData JSON
// Isolé   : Ne reçoit PAS les outputs des autres spokes

import { callClaude, extractJson } from './claudeClient'
import type { SentimentData } from '../types'

const SYSTEM = `Tu es un analyste spécialisé dans l'analyse des avis clients SaaS B2B.
Recherche via le web les avis sur G2, Capterra et Reddit pour le concurrent donné.
Retourne UNIQUEMENT un objet JSON valide :
{
  "avg_score": number (sur 5),
  "review_count": number,
  "top_complaints": ["plainte 1", "plainte 2", "plainte 3"],
  "top_praises": ["point fort 1", "point fort 2", "point fort 3"],
  "sample_quotes": ["verbatim 1 (source : G2)", "verbatim 2", "verbatim 3"]
}
Maximum 3 verbatims. Rien d'autre que le JSON.`

export async function runSentiment(
  competitor: string,
  apiKey: string,
  onLog: (msg: string) => void,
): Promise<SentimentData> {
  onLog(`Recherche avis G2, Capterra, Reddit pour ${competitor}...`)
  const content = await callClaude(
    apiKey,
    SYSTEM,
    `Analyse les avis clients du concurrent SaaS B2B : ${competitor}`,
    true,
    onLog,
  )
  onLog('Extraction JSON...')
  return extractJson<SentimentData>(content)
}
