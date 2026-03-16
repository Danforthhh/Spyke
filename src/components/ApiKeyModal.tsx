import { useState } from 'react'

interface Props {
  onSave: (key: string) => void
}

export default function ApiKeyModal({ onSave }: Props) {
  const [value, setValue] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 12,
        padding: '40px 36px', width: 440, boxShadow: '0 0 60px rgba(108,99,255,0.2)',
      }}>
        <div style={{ marginBottom: 8, fontSize: 11, color: '#6c63ff', letterSpacing: 2, textTransform: 'uppercase' }}>
          Configuration
        </div>
        <h2 style={{ margin: '0 0 8px', color: '#e0e0e0', fontSize: 22 }}>Clé API Anthropic</h2>
        <p style={{ margin: '0 0 24px', color: '#888', fontSize: 13, lineHeight: 1.6 }}>
          Stockée uniquement dans votre navigateur (localStorage). Jamais envoyée ailleurs qu'à api.anthropic.com.
        </p>
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="sk-ant-..."
          onKeyDown={e => e.key === 'Enter' && value.startsWith('sk-ant-') && onSave(value)}
          style={{
            width: '100%', padding: '12px 14px', background: '#0a0a1a',
            border: '1px solid #2a2a4a', borderRadius: 8, color: '#e0e0e0',
            fontSize: 14, fontFamily: 'monospace', marginBottom: 16, boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <button
          onClick={() => value.startsWith('sk-ant-') && onSave(value)}
          disabled={!value.startsWith('sk-ant-')}
          style={{
            width: '100%', padding: '12px', background: value.startsWith('sk-ant-') ? '#6c63ff' : '#2a2a4a',
            border: 'none', borderRadius: 8, color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: value.startsWith('sk-ant-') ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          Enregistrer et continuer
        </button>
        <p style={{ margin: '16px 0 0', fontSize: 11, color: '#555', textAlign: 'center' }}>
          Obtenez une clé sur console.anthropic.com
        </p>
      </div>
    </div>
  )
}
