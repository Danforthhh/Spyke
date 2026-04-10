import type { SpokeStatus } from '../types'

interface Props {
  name: string
  label: string
  status: SpokeStatus
  log: string[]
  model: string
}

const BADGE: Record<SpokeStatus, string> = {
  idle:    'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
  running: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  done:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  error:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const BADGE_LABEL: Record<SpokeStatus, string> = {
  idle:    'Waiting',
  running: 'Running',
  done:    'Done',
  error:   'Error',
}

const BORDER: Record<SpokeStatus, string> = {
  idle:    'border-slate-200 dark:border-slate-700',
  running: 'border-indigo-200 shadow-[0_0_0_3px_rgba(99,102,241,0.07)] dark:border-indigo-700 dark:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]',
  done:    'border-green-200 dark:border-green-800',
  error:   'border-red-200 dark:border-red-800',
}

export default function SpokeLog({ name, label, status, log, model }: Props) {
  return (
    <div className={`bg-white dark:bg-slate-800 border rounded-xl px-3 py-2.5 transition-all duration-200 ${BORDER[status]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${BADGE[status]}`}>
          {status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse-dot inline-block" />
          )}
          {BADGE_LABEL[status]}
        </span>

        <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs font-mono">{name}</span>
        <span className="text-slate-400 dark:text-slate-600 text-xs">·</span>
        <span className="text-slate-500 dark:text-slate-400 text-xs">{label}</span>
        <span className="ml-auto text-[10px] text-slate-300 dark:text-slate-600 font-mono">{model}</span>
      </div>

      {status === 'error' && log.length > 0 && (
        <div className="mt-1 mb-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 font-mono animate-fade-up">
          ✗ {log.filter(l => l.startsWith('Error:')).at(-1) ?? log.at(-1)}
        </div>
      )}

      {log.length > 0 && status !== 'error' && (
        <div className="border-t border-slate-100 dark:border-slate-700/50 pt-1.5 mt-1 max-h-20 overflow-y-auto">
          {log.map((line, i) => {
            const isLast = i === log.length - 1
            return (
              <div
                key={i}
                className={`font-mono text-[10px] leading-relaxed ${isLast ? 'text-slate-600 dark:text-slate-400 animate-fade-up' : 'text-slate-400 dark:text-slate-600'}`}
              >
                &gt; {line}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
