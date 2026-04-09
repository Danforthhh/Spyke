import { useState } from 'react'
import type { SharedProduct, MyProduct } from '../types'

interface Props {
  products: SharedProduct[]
  favoriteId: string | null
  onSelect: (product: SharedProduct) => void
  onSetFavorite: (productId: string | null) => void
  onAddProduct: (product: MyProduct) => Promise<void>
  onClose: () => void
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0a0a1a',
  border: '1px solid #2a2a4a', borderRadius: 6, color: '#e0e0e0',
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, color: '#888', letterSpacing: 1,
  textTransform: 'uppercase', marginBottom: 4,
}

export default function ProductPicker({ products, favoriteId, onSelect, onSetFavorite, onAddProduct, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Add form state
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newPositioning, setNewPositioning] = useState('')
  const [newFeatures, setNewFeatures] = useState('')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    const name = newName.trim()
    const category = newCategory.trim()
    const features = newFeatures.split('\n').map(f => f.trim()).filter(Boolean)

    if (!name || !category) { setAddError('Name and category are required.'); return }
    if (name.length > 100) { setAddError('Name must be 100 characters or fewer.'); return }
    if (category.length > 100) { setAddError('Category must be 100 characters or fewer.'); return }
    if (newTagline.trim().length > 200) { setAddError('Tagline must be 200 characters or fewer.'); return }
    if (newPositioning.trim().length > 500) { setAddError('Positioning must be 500 characters or fewer.'); return }
    if (features.length > 50) { setAddError('Maximum 50 features.'); return }

    setSaving(true)
    setAddError('')
    try {
      await onAddProduct({
        name,
        category,
        tagline: newTagline.trim(),
        positioning: newPositioning.trim(),
        features,
        pricing_tiers: [],
      })
      setNewName(''); setNewCategory(''); setNewTagline('')
      setNewPositioning(''); setNewFeatures('')
      setShowAddForm(false)
    } catch {
      setAddError('Failed to add product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d20', border: '1px solid #2a2a4a', borderRadius: 12,
          width: '100%', maxWidth: 560, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '16px 20px',
          borderBottom: '1px solid #1e1e3a',
        }}>
          <span style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontFamily: 'monospace' }}>
            YOUR PRODUCT
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e3a' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            autoFocus
            style={{ ...INPUT_STYLE, fontSize: 13 }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: 13 }}>
              No products found.
            </div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => { onSelect(p); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #1a1a30',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#13132a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#e0e0e0', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{p.category}</div>
              </div>
              {/* Favorite star */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  onSetFavorite(favoriteId === p.id ? null : p.id)
                }}
                title={favoriteId === p.id ? 'Remove from favorites' : 'Set as default'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, padding: '2px 4px', lineHeight: 1,
                  color: favoriteId === p.id ? '#f5c518' : '#333',
                  transition: 'color 0.15s',
                }}
              >
                {favoriteId === p.id ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>

        {/* Add product section */}
        <div style={{ borderTop: '1px solid #1e1e3a' }}>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', padding: '12px 20px', background: 'none', border: 'none',
                color: '#6c63ff', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'monospace', letterSpacing: 0.5,
              }}
            >
              + Add a product
            </button>
          ) : (
            <div style={{ padding: '16px 20px', display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>
                New product
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={LABEL_STYLE}>Name *</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={INPUT_STYLE} placeholder="ProTop" />
                </div>
                <div>
                  <div style={LABEL_STYLE}>Category *</div>
                  <input value={newCategory} onChange={e => setNewCategory(e.target.value)} style={INPUT_STYLE} placeholder="B2B SaaS CRM" />
                </div>
              </div>
              <div>
                <div style={LABEL_STYLE}>Tagline</div>
                <input value={newTagline} onChange={e => setNewTagline(e.target.value)} style={INPUT_STYLE} placeholder="One-liner" />
              </div>
              <div>
                <div style={LABEL_STYLE}>Positioning (1–2 sentences)</div>
                <textarea
                  value={newPositioning} onChange={e => setNewPositioning(e.target.value)}
                  rows={2} style={{ ...INPUT_STYLE, resize: 'vertical' }}
                  placeholder="What makes this product unique..."
                />
              </div>
              <div>
                <div style={LABEL_STYLE}>Features (one per line)</div>
                <textarea
                  value={newFeatures} onChange={e => setNewFeatures(e.target.value)}
                  rows={3} style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                  placeholder={'Feature 1\nFeature 2\nFeature 3'}
                />
              </div>
              {addError && <div style={{ fontSize: 12, color: '#e05555' }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  style={{
                    padding: '8px 20px', background: saving ? '#1e1e3a' : '#6c63ff',
                    border: 'none', borderRadius: 6, color: saving ? '#555' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Add to shared list'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddError('') }}
                  style={{
                    padding: '8px 16px', background: 'none', border: '1px solid #2a2a4a',
                    borderRadius: 6, color: '#888', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
