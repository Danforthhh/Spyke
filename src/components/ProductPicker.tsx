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

export default function ProductPicker({ products, favoriteId, onSelect, onSetFavorite, onAddProduct, onClose }: Props) {
  const [search,      setSearch]      = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [addError,    setAddError]    = useState('')

  const [newName,        setNewName]        = useState('')
  const [newCategory,    setNewCategory]    = useState('')
  const [newTagline,     setNewTagline]     = useState('')
  const [newPositioning, setNewPositioning] = useState('')
  const [newFeatures,    setNewFeatures]    = useState('')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    const name     = newName.trim()
    const category = newCategory.trim()
    const features = newFeatures.split('\n').map(f => f.trim()).filter(Boolean)

    if (!name || !category)              { setAddError('Name and category are required.'); return }
    if (name.length > 100)               { setAddError('Name must be 100 characters or fewer.'); return }
    if (category.length > 100)           { setAddError('Category must be 100 characters or fewer.'); return }
    if (newTagline.trim().length > 200)  { setAddError('Tagline must be 200 characters or fewer.'); return }
    if (newPositioning.trim().length > 500) { setAddError('Positioning must be 500 characters or fewer.'); return }
    if (features.length > 50)            { setAddError('Maximum 50 features.'); return }

    setSaving(true)
    setAddError('')
    try {
      await onAddProduct({
        name, category,
        tagline:     newTagline.trim(),
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

  const inputCls = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all'

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your product</span>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer bg-transparent border-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">×</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            autoFocus
            className={inputCls}
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">No products found.</div>
          )}
          {filtered.map(p => {
            const initials = p.name.slice(0, 2).toUpperCase()
            const isFav = favoriteId === p.id
            return (
              <div
                key={p.id}
                onClick={() => { onSelect(p); onClose() }}
                className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-500 flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{p.category}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onSetFavorite(isFav ? null : p.id) }}
                  title={isFav ? 'Remove from favorites' : 'Set as default'}
                  className={`text-base p-1 rounded-md transition-colors cursor-pointer bg-transparent border-0 ${
                    isFav ? 'text-amber-400 hover:text-amber-500' : 'text-slate-200 hover:text-slate-400'
                  }`}
                >
                  {isFav ? '★' : '☆'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Add product */}
        <div className="border-t border-slate-100">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-5 py-3 text-left text-sm text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer bg-transparent border-0 flex items-center gap-1.5 font-medium"
            >
              <span className="text-base leading-none">+</span> Add a product
            </button>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New product</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Name *</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ProTop" className={inputCls} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Category *</div>
                  <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="B2B SaaS CRM" className={inputCls} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Tagline</div>
                <input value={newTagline} onChange={e => setNewTagline(e.target.value)} placeholder="One-liner…" className={inputCls} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Positioning</div>
                <textarea value={newPositioning} onChange={e => setNewPositioning(e.target.value)} rows={2} placeholder="What makes this product unique…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Features (one per line)</div>
                <textarea value={newFeatures} onChange={e => setNewFeatures(e.target.value)} rows={3} placeholder={'Feature 1\nFeature 2'} className={`${inputCls} resize-none font-mono text-xs`} />
              </div>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex gap-2 pb-1">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    saving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                  }`}
                >
                  {saving ? 'Saving…' : 'Add to shared list'}
                </button>
                <button onClick={() => { setShowAddForm(false); setAddError('') }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 cursor-pointer">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
