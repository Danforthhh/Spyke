// ARCHITECTURAL ROLE: SPOKE 2 (Sentiment Analyst)
// Inputs  : competitor_name
// Outputs : SentimentData JSON
// Isolated: does NOT receive outputs from other spokes

import { callClaude, extractJson } from './claudeClient'
import type { SentimentData } from '../types'

const SYSTEM = `You are an analyst specializing in B2B SaaS customer review analysis.
Search the web for reviews on G2, Capterra and Reddit for the given competitor.
Return ONLY a valid JSON object:
{
  "avg_score": number (out of 5),
  "review_count": number,
  "top_complaints": ["complaint 1", "complaint 2", "complaint 3"],
  "top_praises": ["strength 1", "strength 2", "strength 3"],
  "sample_quotes": ["verbatim 1 (source: G2)", "verbatim 2", "verbatim 3"]
}
Maximum 3 quotes. Nothing other than the JSON.`

export async function runSentiment(
  competitor: string,
  onLog: (msg: string) => void,
): Promise<SentimentData> {
  onLog(`Searching G2, Capterra, Reddit reviews for ${competitor}...`)
  const content = await callClaude(
    SYSTEM,
    `Analyze customer reviews for B2B SaaS competitor: ${competitor}`,
    true,
    onLog,
  )
  onLog('Extracting JSON...')
  return extractJson<SentimentData>(content)
}
