import { useState, useEffect } from 'react'

interface Widget {
  key: string; label: string; description: string; enabled: boolean
}

const DEFAULT_WIDGETS: Widget[] = [
  { key: 'total_propostas', label: 'Total de Propostas', description: 'Card com o total de propostas no periodo', enabled: true },
  { key: 'aprovacoes', label: 'Aprovacoes', description: 'Card com propostas aprovadas', enabled: true },
  { key: 'reprovacoes', label: 'Reprovacoes', description: 'Card com propostas reprovadas', enabled: true },
  { key: 'pendencias', label: 'Pendencias', description: 'Card com pendencias em aberto', enabled: true },
  { key: 'corretores_ativos', label: 'Corretores Ativos', description: 'Numero de corretores ativos', enabled: false },
  { key: 'importacoes', label: 'Importacoes', description: 'Resumo de importacoes recentes', enabled: true },
  { key: 'antifraude', label: 'Antifraude', description: 'Alertas e status do antifraude', enabled: true },
  { key: 'averbacoes', label: 'Averbacoes', description: 'Propostas averbadas no periodo', enabled: false },
]

const PERIODS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta Semana' },
  { value: 'mes', label: 'Este Mes' },
  { value: '3meses', label: 'Ultimos 3 Meses' },
]

const STORAGE_KEY = 'dashboard_config'

export default function DashboardConfigPage() {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return DEFAULT_WIDGETS.map(w => ({
          ...w,
          enabled: parsed.widgets?.[w.key] ?? w.enabled,
        }))
      }
    } catch {}
    return DEFAULT_WIDGETS
  })

  const [period, setPeriod] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved).period || 'mes'
    } catch {}
    return 'mes'
  })

  const [saved, setSaved] = useState(false)

  const toggle = (key: string) =>
    setWidgets(prev => prev.map(w => w.key === key ? { ...w, enabled: !w.enabled } : w))

  const handleSave = () => {
    const config = {
      period,
      widgets: Object.fromEntries(widgets.map(w => [w.key, w.enabled])),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS)
    setPeriod('mes')
  }

  const enabledCount = widgets.filter(w => w.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuracao do Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{enabledCount} de {widgets.length} widgets ativos</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary">Restaurar Padrao</button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? '✅ Salvo!' : 'Salvar Configuracao'}
          </button>
        </div>
      </div>

      {/* Period */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
          Periodo Padrao
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                period === p.value
                  ? 'border-red-700 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
          Widgets do Dashboard
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map(w => (
            <div
              key={w.key}
              onClick={() => toggle(w.key)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                w.enabled
                  ? 'border-red-700 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  w.enabled ? 'border-red-700 bg-red-700' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {w.enabled && <span className="text-white text-xs leading-none">✓</span>}
                </div>
              </div>
              <div>
                <div className={`text-sm font-semibold ${w.enabled ? 'text-red-800 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {w.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{w.description}</div>
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  w.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {w.enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-pulse">
          ✅ Configuracoes salvas com sucesso!
        </div>
      )}
    </div>
  )
}
