// ARCHITECTURAL ROLE: SPOKE 1 (Web Scraper)
// Inputs  : competitor_name
// Outputs : ScraperData JSON
// Isolated: does NOT receive outputs from other spokes

import { callClaude, extractJson } from './claudeClient'
import type { ScraperData } from '../types'

const SYSTEM = `You are a competitive analyst specializing in B2B SaaS.
Search the web for pricing and feature information about the competitor.
Look for: official pricing page, features page, recent changelog.
Return ONLY a valid JSON object:
{
  "pricing_tiers": [{"name": "...", "price_monthly": number|null, "key_features": ["..."]}],
  "features_list": ["..."],
  "recent_updates": ["... (date if available)"]
}
Nothing other than the JSON.`

export async function runScraper(
  competitor: string,
  onLog: (msg: string) => void,
): Promise<ScraperData> {
  onLog(`Fetching pricing and features for ${competitor}...`)
  const content = await callClaude(
    SYSTEM,
    `Analyze the B2B SaaS competitor: ${competitor}`,
    true,
    onLog,
  )
  onLog('Extracting JSON...')
  return extractJson<ScraperData>(content)
}
