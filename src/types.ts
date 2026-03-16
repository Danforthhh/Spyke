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
    forces: string[]
    faiblesses: string[]
    opportunites: string[]
    menaces: string[]
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
  tagline: 'Le CRM simple qui grandit avec votre équipe',
  pricing_tiers: [
    { name: 'Starter', price_monthly: 29, key_features: ['Pipeline de vente', 'Contacts illimités', 'Email sync'] },
    { name: 'Pro', price_monthly: 79, key_features: ['Tout Starter', 'Automatisations email', 'API REST'] },
    { name: 'Enterprise', price_monthly: 199, key_features: ['Tout Pro', 'SSO/SAML', 'Support dédié'] },
  ],
  features: [
    'Pipeline de vente visuel (kanban)',
    'Gestion des contacts et comptes',
    'Synchronisation email bidirectionnelle',
    'Séquences email automatisées',
    'Rapports et tableaux de bord',
    'Application mobile iOS/Android',
    'API REST publique',
  ],
  positioning: 'CRM abordable et facile à prendre en main pour les PME qui veulent sortir des tableurs sans la complexité de Salesforce ou HubSpot.',
}
