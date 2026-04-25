// ARCHITECTURAL ROLE: INTAKE PASS (pre-spoke)
// Reads an uploaded customer data file (CSV/TXT), calls Claude Haiku,
// and returns a structured summary to be injected into the report prompt.

import { callClaude, extractJson } from './claudeClient'
import type { CustomerDataContext } from '../types'

const MAX_CHARS = 8_000  // ~2k tokens — keeps Haiku cost negligible

const SYSTEM = `You are a data analyst. A user has uploaded a file containing their internal customer or sales data.
Your job is to extract the information that is most useful for a competitive intelligence analysis.
Return ONLY a JSON object with this exact shape:
{
  "rawSummary": "1-2 sentence plain-English description of what the file contains",
  "rowCount": <integer — number of data entries / rows detected, 0 if unknown>,
  "insights": "<multi-line markdown string with the key findings relevant to the competitor analysis: lost deals, objections, patterns, win rates, etc.>"
}`

export async function runIntake(
  fileContent: string,
  fileName: string,
  competitor: string,
  onLog: (msg: string) => void,
  userApiKey?: string | null,
): Promise<CustomerDataContext> {
  const truncated = fileContent.length > MAX_CHARS
    ? fileContent.slice(0, MAX_CHARS) + `\n\n[... truncated — showing first ${MAX_CHARS} characters]`
    : fileContent

  const user = `Competitor being analyzed: ${competitor}

File name: ${fileName}

File contents:
\`\`\`
${truncated}
\`\`\`

Extract the insights most relevant to understanding how deals were won or lost against "${competitor}".`

  onLog(`Reading ${fileName} (${fileContent.length.toLocaleString()} chars)…`)

  try {
    const raw = await callClaude(SYSTEM, user, false, onLog, userApiKey)
    const parsed = extractJson<{ rawSummary: string; rowCount: number; insights: string }>(raw)
    onLog(`✓ Intake complete — ${parsed.rowCount} entries detected`)
    return {
      rawSummary: parsed.rawSummary,
      fileName,
      rowCount: parsed.rowCount,
      insights: parsed.insights,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    onLog(`⚠ Intake parse error: ${msg} — including raw content as fallback`)
    // Graceful fallback: include the raw content directly so the report still benefits
    return {
      rawSummary: `Could not auto-parse "${fileName}" — raw content included below.`,
      fileName,
      rowCount: 0,
      insights: truncated,
    }
  }
}
