// ARCHITECTURAL ROLE: SPOKE 3 (Positioning Analyst)
// Inputs  : competitor_name, myProduct (local data)
// Outputs : PositioningData JSON
// Isolated: does NOT receive outputs from other spokes

import { callClaude, extractJson } from './claudeClient'
import type { PositioningData, MyProduct } from '../types'

const SYSTEM = `You are an expert in B2B SaaS product strategy and positioning.
Search the web for information about the competitor, then compare with the provided product data.
Return ONLY a valid JSON object:
{
  "feature_gaps": [{"feature": "...", "competitor_has": bool, "we_have": bool, "priority": "high|medium|low", "note": "..."}],
  "pricing_position": "1-2 sentence description",
  "swot": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "threats": ["threat 1", "threat 2"]
  }
}
Nothing other than the JSON.`

export async function runPositioning(
  competitor: string,
  myProduct: MyProduct,
  onLog: (msg: string) => void,
): Promise<PositioningData> {
  onLog(`Comparing ${competitor} vs ${myProduct.name}...`)
  const content = await callClaude(
    SYSTEM,
    `Competitor: ${competitor}\n\nOur product:\n\`\`\`json\n${JSON.stringify(myProduct, null, 2)}\n\`\`\``,
    true,
    onLog,
  )
  onLog('Extracting JSON...')
  return extractJson<PositioningData>(content)
}
