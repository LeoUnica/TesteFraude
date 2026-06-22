import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import { useDashboard } from '../hooks/useDashboard'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const STORAGE_KEY = 'dashboard_config'

function readWidgetConfig(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved).widgets || {}
  } catch {}
  return {}
}

export default function Dashboard() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '' })
  const [widgetConfig, setWidgetConfig] = useState<Record<string, boolean>>(() => readWidgetConfig())
  const { data, isLoading } = useDashboard(filters)

  useEffect(() => {
    const onStorage = () => setWidgetConfig(readWidgetConfig())
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onStorage)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onStorage) }
  }, [])

  const show = (key: string) => widgetConfig[key] !== false

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-800" />
    </div>
  )

  const stats = data || {}
  const charts = data?.charts || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Operacional</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão geral da operação da promotora</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="input-field w-40 text-xs"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="input-field w-40 text-xs"
          />
          <button
            onClick={() => setFilters({ date_from: '', date_to: '' })}
            className="btn-secondary text-xs py-2"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Cards de status antifraude */}
      {[
        show('analisar'), show('aprovadas_banco'), show('nao_mapeadas'),
        show('reprovar_banco'), show('suspeita_antifraude'), show('agendar_acompanhamento'),
      ].some(Boolean) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {show('analisar') && <StatCard title="Analisar" value={stats.inAnalysis ?? 0} amount={stats.inAnalysisValue ?? 0} icon="🔍" color="bg-purple-50 dark:bg-purple-900/20" subtitle="Blacklist / passa na esteira" />}
          {show('aprovadas_banco') && <StatCard title="Aprovadas no Banco" value={stats.approvedAuto ?? 0} amount={stats.approvedAutoValue ?? 0} icon="✅" color="bg-emerald-50 dark:bg-emerald-900/20" subtitle="Dentro do banco" />}
          {show('nao_mapeadas') && <StatCard title="Não Mapeadas" value={stats.notMapped ?? 0} amount={stats.notMappedValue ?? 0} icon="🗂️" color="bg-yellow-50 dark:bg-yellow-900/20" subtitle="Mapeamento de convênios" />}
          {show('reprovar_banco') && <StatCard title="Reprovar no Banco" value={stats.rejected ?? 0} amount={stats.rejectedValue ?? 0} icon="❌" color="bg-red-50 dark:bg-red-900/20" subtitle="Reprovação bancária" />}
          {show('suspeita_antifraude') && <StatCard title="Suspeita de Antifraude" value={stats.fraudSuspect ?? 0} amount={stats.fraudSuspectValue ?? 0} icon="🚨" color="bg-amber-50 dark:bg-amber-900/20" subtitle="Triagem antifraude" />}
          {show('agendar_acompanhamento') && <StatCard title="Agendar para Acompanhamento" value={stats.scheduled ?? 0} amount={stats.scheduledValue ?? 0} icon="📅" color="bg-sky-50 dark:bg-sky-900/20" subtitle="Agendado" />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Propostas por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.byMonth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
              <Line type="monotone" dataKey="count" name="Propostas" stroke="#991b1b" strokeWidth={2} dot={{ fill: '#991b1b', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Status Antifraude</h3>
          {charts.byAntifraud?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.byAntifraud}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, percent }: any) => `${status} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(charts.byAntifraud || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top 10 Bancos</h3>
          {charts.byBank?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byBank} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis dataKey="bank_name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                <Bar dataKey="count" name="Propostas" fill="#991b1b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top 10 Convênios</h3>
          {charts.byConvenio?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byConvenio} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis dataKey="convenio_name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                <Bar dataKey="count" name="Propostas" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Status das Propostas</h3>
          {charts.byStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                <Bar dataKey="count" name="Quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Corretores</h3>
          {charts.byBroker?.length > 0 ? (
            <div className="space-y-2">
              {charts.byBroker.slice(0, 8).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.broker_name || 'Sem corretor'}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-red-800 h-1.5 rounded-full"
                        style={{ width: `${(item.count / (charts.byBroker[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
      Nenhum dado disponível
    </div>
  )
}
