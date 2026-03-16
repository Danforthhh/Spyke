// RÔLE ARCHITECTURAL : SPOKE 3 (Positioning Analyst)
// Inputs  : competitor_name, apiKey, myProduct (données locales)
// Outputs : PositioningData JSON
// Isolé   : Ne reçoit PAS les outputs des autres spokes

import { callClaude, extractJson } from './claudeClient'
import type { PositioningData, MyProduct } from '../types'

const SYSTEM = `Tu es un expert en stratégie produit et positionnement SaaS B2B.
Recherche les informations sur le concurrent via le web, puis compare avec les données produit fournies.
Retourne UNIQUEMENT un objet JSON valide :
{
  "feature_gaps": [{"feature": "...", "competitor_has": bool, "we_have": bool, "priority": "high|medium|low", "note": "..."}],
  "pricing_position": "description 1-2 phrases",
  "swot": {
    "forces": ["force 1", "force 2", "force 3"],
    "faiblesses": ["faiblesse 1", "faiblesse 2"],
    "opportunites": ["opportunité 1", "opportunité 2"],
    "menaces": ["menace 1", "menace 2"]
  }
}
Rien d'autre que le JSON.`

export async function runPositioning(
  competitor: string,
  apiKey: string,
  myProduct: MyProduct,
  onLog: (msg: string) => void,
): Promise<PositioningData> {
  onLog(`Comparaison ${competitor} vs ${myProduct.name}...`)
  const content = await callClaude(
    apiKey,
    SYSTEM,
    `Concurrent : ${competitor}\n\nNotre produit :\n\`\`\`json\n${JSON.stringify(myProduct, null, 2)}\n\`\`\``,
    true,
    onLog,
  )
  onLog('Extraction JSON...')
  return extractJson<PositioningData>(content)
}
