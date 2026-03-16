import type { SpokeStatus } from '../types'

interface Props {
  name: string
  label: string
  status: SpokeStatus
  log: string[]
  model: string
}

const STATUS_COLOR: Record<SpokeStatus, string> = {
  idle: '#444',
  running: '#6c63ff',
  done: '#4caf50',
  error: '#f44336',
}

const STATUS_ICON: Record<SpokeStatus, string> = {
  idle: '○',
  running: '◌',
  done: '●',
  error: '✗',
}

export default function SpokeLog({ name, label, status, log, model }: Props) {
  return (
    <div style={{
      background: '#0d0d20', border: `1px solid ${status === 'running' ? '#6c63ff44' : '#1e1e3a'}`,
      borderRadius: 8, padding: '14px 16px', transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: log.length ? 10 : 0 }}>
        <span style={{
          color: STATUS_COLOR[status], fontSize: 16,
          animation: status === 'running' ? 'spin 1s linear infinite' : 'none',
        }}>
          {STATUS_ICON[status]}
        </span>
        <span style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
          {name}
        </span>
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>{label}</span>
        <span style={{ marginLeft: 'auto', color: '#444', fontSize: 10, fontFamily: 'monospace' }}>{model}</span>
      </div>
      {log.length > 0 && (
        <div style={{
          fontFamily: 'monospace', fontSize: 11, color: '#666', lineHeight: 1.7,
          borderTop: '1px solid #1e1e3a', paddingTop: 10, maxHeight: 80, overflowY: 'auto',
        }}>
          {log.map((line, i) => (
            <div key={i} style={{ color: i === log.length - 1 ? '#aaa' : '#555' }}>
              {'>'} {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
