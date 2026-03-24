// ARCHITECTURAL ROLE: SPOKE 3 (Positioning Analyst)
// Inputs  : competitor_name, myProduct (local data)
// Outputs : PositioningData JSON
// Isolated: does NOT receive outputs from other spokes

import { callClaude, extractJson } from './claudeClient'
import type { PositioningData, MyProduct } from '../types'

const SYSTEM = `You are an expert in B2B SaaS product strategy and positioning.
Search the web for information about the COMPETITOR, then produce a competitive analysis.
IMPORTANT: The SWOT is the COMPETITOR's SWOT (their strengths, their weaknesses, their opportunities, their threats) — NOT our product's SWOT.
Return ONLY a valid JSON object:
{
  "feature_gaps": [{"feature": "...", "competitor_has": bool, "we_have": bool, "priority": "high|medium|low", "note": "..."}],
  "pricing_position": "1-2 sentence description of the competitor's pricing position vs ours",
  "swot": {
    "strengths": ["competitor strength 1", "competitor strength 2", "competitor strength 3"],
    "weaknesses": ["competitor weakness 1", "competitor weakness 2"],
    "opportunities": ["competitor opportunity 1", "competitor opportunity 2"],
    "threats": ["competitor threat 1", "competitor threat 2"]
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
