import { doc, getDoc, setDoc, deleteField, updateDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { db, auth } from './firebase'
import type { EncryptedKeyBundle, SavedReport, SharedProduct, MyProduct } from '../types'

// Firestore path: users/{uid}/settings (single document per user)

export interface UserSettings {
  encryptedKey: string
  keySalt: string
  keyIv: string
}

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'apiKey'))
  if (!snap.exists()) return null
  return snap.data() as UserSettings
}

export async function saveEncryptedKey(uid: string, bundle: EncryptedKeyBundle): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'apiKey'), {
    encryptedKey: bundle.encryptedKey,
    keySalt:      bundle.keySalt,
    keyIv:        bundle.keyIv,
  })
}

export async function removeEncryptedKey(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'settings', 'apiKey'), {
    encryptedKey: deleteField(),
    keySalt:      deleteField(),
    keyIv:        deleteField(),
  })
}

// ── Report persistence ──────────────────────────────────────────────────────
// Path: users/{uid}/reports/{auto-id}
// Firestore rules must allow: match /users/{uid}/reports/{r} { allow read, write: if request.auth.uid == uid; }

export async function saveReport(uid: string, competitor: string, html: string): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'reports'), {
    competitor,
    html,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listReports(uid: string): Promise<SavedReport[]> {
  const q = query(collection(db, 'users', uid, 'reports'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      competitor: data.competitor as string,
      html: data.html as string,
      createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
    }
  })
}

export async function deleteReport(uid: string, reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'reports', reportId))
}

// ── Shared product database ──────────────────────────────────────────────────
// Path: products/{productId}
// Security rules must allow:
//   match /products/{productId} {
//     allow read, create: if request.auth != null;
//     allow update, delete: if request.auth.uid == resource.data.createdBy;
//   }

export async function listSharedProducts(): Promise<SharedProduct[]> {
  const q = query(collection(db, 'products'), orderBy('name', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name as string,
      category: data.category as string,
      tagline: data.tagline as string,
      positioning: data.positioning as string,
      features: data.features as string[],
      pricing_tiers: data.pricing_tiers as MyProduct['pricing_tiers'],
      createdBy: data.createdBy as string,
      createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
    }
  })
}

export async function addSharedProduct(uid: string, product: MyProduct): Promise<string> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Unauthorized')
  }
  const ref = await addDoc(collection(db, 'products'), {
    ...product,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ── User favorite product ────────────────────────────────────────────────────
// Path: users/{uid}/settings/preferences

export async function getFavoriteProductId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'))
  if (!snap.exists()) return null
  return (snap.data().favoriteProductId as string) ?? null
}

export async function setFavoriteProductId(uid: string, productId: string | null): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), { favoriteProductId: productId })
}

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_PRODUCTS: Omit<SharedProduct, 'id' | 'createdBy' | 'createdAt'>[] = [
  {
    name: 'ActiveCampaign',
    category: 'B2B SaaS Marketing Automation',
    tagline: 'The email marketing, marketing automation, and CRM tools you need',
    positioning: 'All-in-one customer experience automation platform combining email marketing, automation, and CRM for growing businesses.',
    features: ['Email marketing', 'Marketing automation', 'CRM & sales automation', 'Landing pages', 'SMS marketing', 'Site tracking', 'Segmentation'],
    pricing_tiers: [
      { name: 'Starter', price_monthly: 15, key_features: ['Email marketing', 'Marketing automation', '1 user'] },
      { name: 'Plus', price_monthly: 49, key_features: ['CRM', 'Landing pages', '3 users'] },
      { name: 'Professional', price_monthly: 79, key_features: ['Predictive sending', 'Site messages', '5 users'] },
      { name: 'Enterprise', price_monthly: 145, key_features: ['Custom reporting', 'Unlimited users', 'Dedicated support'] },
    ],
  },
  {
    name: 'Apollo.io',
    category: 'B2B SaaS Sales Intelligence',
    tagline: 'Find, contact, and close your ideal buyers',
    positioning: 'All-in-one sales intelligence and engagement platform with a database of 275M+ contacts for prospecting and outreach.',
    features: ['Contact database (275M+)', 'Email sequences', 'Dialer', 'LinkedIn integration', 'Intent data', 'CRM sync', 'Analytics'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['Basic search', '50 email credits/month'] },
      { name: 'Basic', price_monthly: 49, key_features: ['Unlimited email credits', 'Sequences'] },
      { name: 'Professional', price_monthly: 79, key_features: ['Dialer', 'Advanced filters', 'AI writing'] },
      { name: 'Organization', price_monthly: 119, key_features: ['Custom roles', 'SSO', 'Advanced analytics'] },
    ],
  },
  {
    name: 'Close CRM',
    category: 'B2B SaaS Sales',
    tagline: 'The CRM built for inside sales teams',
    positioning: 'Sales-focused CRM with built-in calling, SMS, and email — designed for inside sales teams to close more deals faster.',
    features: ['Built-in calling & SMS', 'Email sequences', 'Pipeline management', 'Power dialer', 'Predictive dialer', 'Reporting', 'Zapier integrations'],
    pricing_tiers: [
      { name: 'Startup', price_monthly: 49, key_features: ['3 users', 'Email & calling', 'Pipeline'] },
      { name: 'Professional', price_monthly: 99, key_features: ['Unlimited users', 'Power dialer', 'Sequences'] },
      { name: 'Enterprise', price_monthly: 139, key_features: ['Predictive dialer', 'Custom roles', 'Priority support'] },
    ],
  },
  {
    name: 'Copper CRM',
    category: 'B2B SaaS CRM',
    tagline: 'The CRM designed for Google Workspace',
    positioning: 'CRM deeply integrated with Google Workspace — syncs Gmail, Calendar, and Drive automatically so teams never leave their inbox.',
    features: ['Google Workspace integration', 'Email tracking', 'Pipeline management', 'Automated data entry', 'Contact enrichment', 'Reporting', 'Slack integration'],
    pricing_tiers: [
      { name: 'Starter', price_monthly: 9, key_features: ['Basic CRM', 'Gmail integration', '3 users'] },
      { name: 'Basic', price_monthly: 23, key_features: ['Pipelines', 'Reports', 'Bulk email'] },
      { name: 'Professional', price_monthly: 59, key_features: ['Workflow automation', 'API access', 'Unlimited users'] },
      { name: 'Business', price_monthly: 99, key_features: ['Advanced reporting', 'Custom fields', 'Priority support'] },
    ],
  },
  {
    name: 'Freshsales',
    category: 'B2B SaaS CRM',
    tagline: 'AI-powered CRM to help your sales team close deals faster',
    positioning: 'Modern CRM with built-in AI (Freddy AI) for lead scoring, email engagement, and sales forecasting — part of the Freshworks suite.',
    features: ['AI lead scoring (Freddy AI)', 'Built-in phone & email', 'Sales sequences', 'Visual pipeline', 'Forecasting', 'Workflow automation', 'Mobile app'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['Unlimited users', 'Basic CRM', 'Mobile app'] },
      { name: 'Growth', price_monthly: 15, key_features: ['AI insights', 'Sales sequences', 'Custom fields'] },
      { name: 'Pro', price_monthly: 39, key_features: ['Multiple pipelines', 'Time-based workflows', 'AI forecasting'] },
      { name: 'Enterprise', price_monthly: 69, key_features: ['Custom modules', 'Audit logs', 'Dedicated manager'] },
    ],
  },
  {
    name: 'HubSpot CRM',
    category: 'B2B SaaS CRM',
    tagline: 'The CRM platform that grows with your business',
    positioning: 'All-in-one inbound marketing, sales, and service platform — free CRM core with paid hubs for marketing, sales, and support.',
    features: ['Free CRM', 'Email marketing', 'Landing pages', 'Live chat', 'Sales sequences', 'Deal pipeline', 'Reporting', 'App marketplace (1500+)'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['CRM', 'Email tracking', 'Basic reporting'] },
      { name: 'Starter', price_monthly: 20, key_features: ['Email automation', 'Ad management', 'Payments'] },
      { name: 'Professional', price_monthly: 800, key_features: ['Marketing automation', 'Custom reporting', 'ABM tools'] },
      { name: 'Enterprise', price_monthly: 3600, key_features: ['Custom objects', 'Predictive scoring', 'SSO'] },
    ],
  },
  {
    name: 'Instantly.ai',
    category: 'B2B SaaS Cold Outreach',
    tagline: 'Scale your cold email outreach, instantly',
    positioning: 'Cold email platform focused on deliverability and scale — unlimited sending accounts, warmup automation, and AI-powered personalization.',
    features: ['Unlimited sending accounts', 'Email warmup', 'AI personalization', 'Deliverability analytics', 'Unibox (unified inbox)', 'CRM lite', 'API'],
    pricing_tiers: [
      { name: 'Growth', price_monthly: 37, key_features: ['5K active leads', '20K emails/month', 'Unlimited accounts'] },
      { name: 'Hypergrowth', price_monthly: 97, key_features: ['100K active leads', '500K emails/month', 'Premium support'] },
      { name: 'Light Speed', price_monthly: 358, key_features: ['500K active leads', '5M emails/month', 'Dedicated IP'] },
    ],
  },
  {
    name: 'Klaviyo',
    category: 'B2B SaaS Email Marketing',
    tagline: 'The platform for intelligent marketing automation',
    positioning: 'Data-driven email and SMS marketing platform built for e-commerce — deep Shopify/WooCommerce integrations and predictive analytics.',
    features: ['Email marketing', 'SMS marketing', 'Segmentation', 'Flows automation', 'A/B testing', 'Predictive analytics', 'Shopify/WooCommerce integration'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['500 contacts', '500 email sends', 'Email support'] },
      { name: 'Email', price_monthly: 45, key_features: ['Up to 1500 contacts', 'Email flows', 'Benchmarks'] },
      { name: 'Email & SMS', price_monthly: 60, key_features: ['Email + SMS', 'Mobile push', 'Priority support'] },
    ],
  },
  {
    name: 'Lemlist',
    category: 'B2B SaaS Cold Outreach',
    tagline: 'Outreach platform that gets replies',
    positioning: 'Multi-channel outreach platform (email, LinkedIn, calls) with personalized images/videos and a built-in lead database.',
    features: ['Personalized images & videos', 'Multi-channel sequences (email + LinkedIn + calls)', 'Lead database (450M+)', 'Email warmup (lemwarm)', 'A/B testing', 'CRM integrations'],
    pricing_tiers: [
      { name: 'Email Starter', price_monthly: 39, key_features: ['1 sending account', 'Email sequences', 'Basic personalization'] },
      { name: 'Email Pro', price_monthly: 69, key_features: ['3 sending accounts', 'Image personalization', 'CRM sync'] },
      { name: 'Multi-channel Expert', price_monthly: 99, key_features: ['LinkedIn automation', 'Cold calling', 'Video personalization'] },
      { name: 'Enterprise', price_monthly: 159, key_features: ['Custom seats', 'Dedicated IP', 'Priority support'] },
    ],
  },
  {
    name: 'Monday.com CRM',
    category: 'B2B SaaS CRM',
    tagline: 'A CRM your team will actually use',
    positioning: 'Flexible CRM built on monday.com Work OS — highly customizable pipelines and automations for sales teams already using monday.',
    features: ['Customizable pipelines', 'Contact management', 'Email sync', 'Automations', 'Dashboards', 'Integrations (200+)', 'Mobile app'],
    pricing_tiers: [
      { name: 'Basic', price_monthly: 15, key_features: ['Unlimited contacts', 'Pipelines', 'iOS/Android app'] },
      { name: 'Standard', price_monthly: 20, key_features: ['AI email', 'Activity tracking', 'Integrations'] },
      { name: 'Pro', price_monthly: 33, key_features: ['Sales forecasting', 'Custom fields', 'Google integration'] },
      { name: 'Enterprise', price_monthly: 0, key_features: ['Enterprise security', 'Advanced analytics', 'Custom onboarding'] },
    ],
  },
  {
    name: 'Outreach',
    category: 'B2B SaaS Sales Engagement',
    tagline: 'The sales execution platform',
    positioning: 'Enterprise sales execution platform with AI-powered deal insights, sequences, and conversation intelligence for large sales teams.',
    features: ['Sales sequences', 'AI deal health', 'Conversation intelligence', 'Mutual action plans', 'Revenue forecasting', 'Kaia AI assistant', 'CRM integrations'],
    pricing_tiers: [
      { name: 'Standard', price_monthly: 100, key_features: ['Sequences', 'Email & calling', 'Basic reporting'] },
      { name: 'Professional', price_monthly: 0, key_features: ['AI insights', 'Conversation intelligence', 'Forecasting'] },
      { name: 'Enterprise', price_monthly: 0, key_features: ['Custom SLA', 'Dedicated CSM', 'Advanced security'] },
    ],
  },
  {
    name: 'Pipedrive',
    category: 'B2B SaaS CRM',
    tagline: 'The CRM designed to help you sell',
    positioning: 'Activity-based selling CRM — visual pipeline and AI sales assistant help SMB sales teams focus on the right deals.',
    features: ['Visual pipeline', 'AI sales assistant', 'Email integration', 'Activity reminders', 'Automations', 'Reporting', 'Mobile app', 'Marketplace (400+)'],
    pricing_tiers: [
      { name: 'Essential', price_monthly: 14, key_features: ['Pipelines', 'Contacts', 'Calendar integration'] },
      { name: 'Advanced', price_monthly: 34, key_features: ['Email sequences', 'Automations', 'Meeting scheduler'] },
      { name: 'Professional', price_monthly: 49, key_features: ['AI assistant', 'Revenue forecasting', 'Custom fields'] },
      { name: 'Power', price_monthly: 64, key_features: ['Project planning', 'Phone support', 'CRM customization'] },
    ],
  },
  {
    name: 'ProTop',
    category: 'B2B SaaS Database Monitoring & Alerting',
    tagline: 'Monitor OpenEdge. Anticipate Problems. Avert Disasters.',
    positioning: 'Leading real-time monitoring and alerting solution purpose-built for Progress OpenEdge environments — enabling proactive database management across cloud, on-premise, and hybrid deployments.',
    features: ['Real-time monitoring dashboard', '100+ performance metrics', 'Multi-level alerting (info/alert/alarm/page)', 'Automated script response', 'Slack / Teams / ServiceNow integrations', 'Historical data analysis', 'DBA toolkit', 'Web portal for distributed servers'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['1 server', '5 databases', 'Basic monitoring', 'Partial trend graphs'] },
      { name: 'Advanced', price_monthly: 0, key_features: ['5 servers', 'Unlimited databases', 'Email & third-party alerts', 'Expanded history'] },
      { name: 'Enterprise', price_monthly: 0, key_features: ['Unlimited servers', 'App-specific monitoring', 'Replication support', 'Custom integrations'] },
      { name: 'Ultimate', price_monthly: 0, key_features: ['On-premise portal', 'Unlimited users', 'Advanced DB monitoring', 'Custom pricing'] },
    ],
  },
  {
    name: 'Salesloft',
    category: 'B2B SaaS Sales Engagement',
    tagline: 'The leading revenue orchestration platform',
    positioning: 'Revenue orchestration platform combining sales engagement, conversation intelligence, and deal management for enterprise revenue teams.',
    features: ['Cadences (sequences)', 'Conversation intelligence', 'Deal management', 'Forecasting', 'Coaching & scorecards', 'Dialer', 'CRM integrations'],
    pricing_tiers: [
      { name: 'Essentials', price_monthly: 0, key_features: ['Cadences', 'Email & calling', 'Basic analytics'] },
      { name: 'Advanced', price_monthly: 0, key_features: ['Conversation intelligence', 'Deal rooms', 'Forecasting'] },
      { name: 'Premier', price_monthly: 0, key_features: ['Full platform', 'Dedicated CSM', 'Custom SLA'] },
    ],
  },
  {
    name: 'Salesforce Sales Cloud',
    category: 'B2B SaaS CRM',
    tagline: 'The world\'s #1 CRM',
    positioning: 'Enterprise-grade CRM platform with deep customization, AI-powered forecasting (Einstein), and the world\'s largest AppExchange ecosystem.',
    features: ['Lead & opportunity management', 'Einstein AI forecasting', 'AppExchange (7000+ apps)', 'Sales automation', 'Territory management', 'CPQ', 'Mobile app'],
    pricing_tiers: [
      { name: 'Starter Suite', price_monthly: 25, key_features: ['Basic CRM', 'Email integration', 'Reports'] },
      { name: 'Professional', price_monthly: 80, key_features: ['Pipeline management', 'Forecasting', 'Custom apps'] },
      { name: 'Enterprise', price_monthly: 165, key_features: ['Advanced automation', 'Einstein AI', 'API access'] },
      { name: 'Unlimited', price_monthly: 330, key_features: ['Unlimited customization', 'Premier support', 'AI insights'] },
    ],
  },
  {
    name: 'Zoho CRM',
    category: 'B2B SaaS CRM',
    tagline: 'Close more deals. Grow your revenue faster.',
    positioning: 'Feature-rich CRM at an accessible price point — part of the Zoho ecosystem, ideal for teams already using Zoho products.',
    features: ['Lead & contact management', 'Zia AI assistant', 'Email marketing', 'Social CRM', 'Workflow automation', 'Blueprint (process management)', 'Analytics'],
    pricing_tiers: [
      { name: 'Free', price_monthly: 0, key_features: ['3 users', 'Basic CRM', 'Mobile app'] },
      { name: 'Standard', price_monthly: 14, key_features: ['Scoring rules', 'Email insights', 'Custom dashboards'] },
      { name: 'Professional', price_monthly: 23, key_features: ['Blueprint', 'SalesSignals', 'Inventory management'] },
      { name: 'Enterprise', price_monthly: 40, key_features: ['Zia AI', 'CommandCenter', 'Advanced customization'] },
    ],
  },
]

export async function seedSharedProducts(_uid: string): Promise<void> {
  const batch = writeBatch(db)
  for (const product of SEED_PRODUCTS) {
    const ref = doc(collection(db, 'products'))
    batch.set(ref, {
      ...product,
      createdBy: '__system__',
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()
}
