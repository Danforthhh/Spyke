// RÔLE ARCHITECTURAL : SPOKE 4 (Report Writer)
// Inputs  : outputs des 3 spokes (via hub), competitor_name, myProduct
// Outputs : rapport HTML complet (streamé chunk par chunk)

import { callClaudeStreaming } from './claudeClient'
import type { ScraperData, SentimentData, PositioningData, MyProduct } from '../types'

const SYSTEM = `Tu es un expert en intelligence compétitive et communication executive B2B.
Génère un rapport HTML complet et autonome (CSS inline) prêt pour présentation.

Structure obligatoire :
1. Executive Summary (5 lignes max)
2. Pricing Analysis (tableau comparatif HTML)
3. Feature Comparison Table (Feature | Nous | Concurrent | Priorité)
4. SWOT (4 quadrants colorés)
5. Recommandations stratégiques (exactement 3 bullets)

Style :
- Font : system-ui, sans-serif ; max-width 900px centré
- Header : fond #1a1a2e, texte blanc
- SWOT couleurs : Forces=#d4edda, Faiblesses=#f8d7da, Opportunités=#cce5ff, Menaces=#fff3cd
- Tables avec alternance de couleurs
- Mentionne si des données sont manquantes (spoke en échec)
Retourne UNIQUEMENT le HTML complet, commençant par <!DOCTYPE html>.`

function buildPrompt(
  competitor: string,
  scraper: ScraperData | null,
  sentiment: SentimentData | null,
  positioning: PositioningData | null,
  myProduct: MyProduct,
): string {
  const parts = [`# Rapport : ${competitor} | Notre produit : ${myProduct.name}\n`]

  parts.push(scraper
    ? `## Spoke 1 — Pricing & Features\n\`\`\`json\n${JSON.stringify(scraper, null, 2)}\n\`\`\``
    : '## Spoke 1 — Pricing & Features\n**DONNÉES INDISPONIBLES**')

  parts.push(sentiment
    ? `## Spoke 2 — Sentiment\n\`\`\`json\n${JSON.stringify(sentiment, null, 2)}\n\`\`\``
    : '## Spoke 2 — Sentiment\n**DONNÉES INDISPONIBLES**')

  parts.push(positioning
    ? `## Spoke 3 — Positionnement\n\`\`\`json\n${JSON.stringify(positioning, null, 2)}\n\`\`\``
    : '## Spoke 3 — Positionnement\n**DONNÉES INDISPONIBLES**')

  return parts.join('\n\n')
}

export async function* runReport(
  competitor: string,
  scraper: ScraperData | null,
  sentiment: SentimentData | null,
  positioning: PositioningData | null,
  myProduct: MyProduct,
  deep = false,
): AsyncGenerator<string> {
  const user = buildPrompt(competitor, scraper, sentiment, positioning, myProduct)
  yield* callClaudeStreaming(SYSTEM, user, deep)
}
