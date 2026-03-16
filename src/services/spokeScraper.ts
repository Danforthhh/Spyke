// RÔLE ARCHITECTURAL : SPOKE 1 (Web Scraper)
// Inputs  : competitor_name, apiKey
// Outputs : ScraperData JSON
// Isolé   : Ne reçoit PAS les outputs des autres spokes

import { callClaude, extractJson } from './claudeClient'
import type { ScraperData } from '../types'

const SYSTEM = `Tu es un analyste compétitif spécialisé dans les SaaS B2B.
Recherche via le web les informations de pricing et fonctionnalités du concurrent.
Cherche : page pricing officielle, page features, changelog récent.
Retourne UNIQUEMENT un objet JSON valide :
{
  "pricing_tiers": [{"name": "...", "price_monthly": number|null, "key_features": ["..."]}],
  "features_list": ["..."],
  "recent_updates": ["... (date si disponible)"]
}
Rien d'autre que le JSON.`

export async function runScraper(
  competitor: string,
  apiKey: string,
  onLog: (msg: string) => void,
): Promise<ScraperData> {
  onLog(`Recherche pricing et features de ${competitor}...`)
  const content = await callClaude(
    apiKey,
    SYSTEM,
    `Analyse le concurrent SaaS B2B : ${competitor}`,
    true,
    onLog,
  )
  onLog('Extraction JSON...')
  return extractJson<ScraperData>(content)
}
