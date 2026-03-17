export type SpokeStatus = 'idle' | 'running' | 'done' | 'error'

export interface SpokeState {
  status: SpokeStatus
  log: string[]
  durationMs?: number
}

export interface SpokesState {
  scraper: SpokeState
  sentiment: SpokeState
  positioning: SpokeState
  report: SpokeState
}

export interface ScraperData {
  pricing_tiers: { name: string; price_monthly: number | null; key_features: string[] }[]
  features_list: string[]
  recent_updates: string[]
}

export interface SentimentData {
  avg_score: number
  review_count: number
  top_complaints: string[]
  top_praises: string[]
  sample_quotes: string[]
}

export interface PositioningData {
  feature_gaps: { feature: string; competitor_has: boolean; we_have: boolean; priority: string; note: string }[]
  pricing_position: string
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
}

export interface MyProduct {
  name: string
  category: string
  tagline: string
  pricing_tiers: { name: string; price_monthly: number; key_features: string[] }[]
  features: string[]
  positioning: string
}

export const DEFAULT_MY_PRODUCT: MyProduct = {
  name: 'FlowDesk',
  category: 'B2B SaaS CRM',
  tagline: 'The simple CRM that grows with your team',
  pricing_tiers: [
    { name: 'Starter', price_monthly: 29, key_features: ['Sales pipeline', 'Unlimited contacts', 'Email sync'] },
    { name: 'Pro', price_monthly: 79, key_features: ['Everything in Starter', 'Email automation', 'REST API'] },
    { name: 'Enterprise', price_monthly: 199, key_features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support'] },
  ],
  features: [
    'Visual sales pipeline (kanban)',
    'Contact and account management',
    'Two-way email synchronization',
    'Automated email sequences',
    'Reports and dashboards',
    'iOS/Android mobile app',
    'Public REST API',
  ],
  positioning: 'Affordable and easy-to-use CRM for SMBs looking to move off spreadsheets without the complexity of Salesforce or HubSpot.',
}
