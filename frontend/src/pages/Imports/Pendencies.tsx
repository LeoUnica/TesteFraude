import { useState } from 'react'

type Priority = 'Alta' | 'Media' | 'Baixa'
type PendencyStatus = 'Aberto' | 'Em Andamento' | 'Resolvido'

interface Pendency {
  id: string; code: string; type: string; description: string;
  priority: Priority; status: PendencyStatus; date: string; responsible: string
}

const PRIORITY_STYLES: Record<Priority, string> = {
  Alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Baixa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const STATUS_STYLES: Record<PendencyStatus, string> = {
  Aberto: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'Em Andamento': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Resolvido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const MOCK: Pendency[] = [
  { id: '1', code: 'PEN-001', type: 'CPF Invalido', description: 'CPF do cliente nao validado na Receita Federal', priority: 'Alta', status: 'Aberto', date: '2026-06-19', responsible: 'Maria Silva' },
  { id: '2', code: 'PEN-002', type: 'Banco Nao Mapeado', description: 'Banco "NUBANK" nao encontrado na base de dados', priority: 'Media', status: 'Em Andamento', date: '2026-06-18', responsible: 'Joao Costa' },
  { id: '3', code: 'PEN-003', type: 'Convenio Invalido', description: 'Convenio "PMSP" nao cadastrado no sistema', priority: 'Alta', status: 'Aberto', date: '2026-06-18', responsible: '—' },
  { id: '4', code: 'PEN-004', type: 'Valor Zerado', description: 'Proposta com valor igual a zero na importacao', priority: 'Baixa', status: 'Resolvido', date: '2026-06-17', responsible: 'Ana Santos' },
  { id: '5', code: 'PEN-005', type: 'Duplicidade', description: 'CPF 123.456.789-00 ja possui proposta no sistema', priority: 'Alta', status: 'Aberto', date: '2026-06-17', responsible: '—' },
]

export default function PendenciesPage() {
  const [pendencies, setPendencies] = useState<Pendency[]>(MOCK)
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = pendencies.filter(p => {
    if (filterPriority && p.priority !== filterPriority) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })

  const counts = {
    total: pendencies.filter(p => p.status !== 'Resolvido').length,
    alta: pendencies.filter(p => p.priority === 'Alta' && p.status !== 'Resolvido').length,
    media: pendencies.filter(p => p.priority === 'Media' && p.status !== 'Resolvido').length,
    baixa: pendencies.filter(p => p.priority === 'Baixa' && p.status !== 'Resolvido').length,
  }

  const resolve = (id: string) =>
    setPendencies(prev => prev.map(p => p.id === id ? { ...p, status: 'Resolvido' } : p))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Painel de Pendencias</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Pendencias geradas durante as importacoes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">{counts.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Pendencias</div>
        </div>
        <div className="card text-center bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900">
          <div className="text-3xl font-bold text-red-600">{counts.alta}</div>
          <div className="text-xs text-gray-500 mt-1">Alta Prioridade</div>
        </div>
        <div className="card text-center bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900">
          <div className="text-3xl font-bold text-amber-600">{counts.media}</div>
          <div className="text-xs text-gray-500 mt-1">Media Prioridade</div>
        </div>
        <div className="card text-center bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900">
          <div className="text-3xl font-bold text-blue-600">{counts.baixa}</div>
          <div className="text-xs text-gray-500 mt-1">Baixa Prioridade</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3">
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input-field text-xs">
            <option value="">Todas as prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baixa">Baixa</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-xs">
            <option value="">Todos os status</option>
            <option value="Aberto">Aberto</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Resolvido">Resolvido</option>
          </select>
        </div>
        <button onClick={() => { setFilterPriority(''); setFilterStatus('') }} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Limpar filtros</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Codigo</th>
              <th className="table-header text-left">Tipo</th>
              <th className="table-header text-left">Descricao</th>
              <th className="table-header text-center">Prioridade</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-left">Data</th>
              <th className="table-header text-left">Responsavel</th>
              <th className="table-header text-center">Acao</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhuma pendencia encontrada</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${p.status === 'Resolvido' ? 'opacity-60' : ''}`}>
                <td className="table-cell font-mono text-xs text-blue-700 dark:text-blue-400">{p.code}</td>
                <td className="table-cell text-xs font-medium">{p.type}</td>
                <td className="table-cell text-gray-600 dark:text-gray-400 max-w-xs truncate">{p.description}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                </td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                </td>
                <td className="table-cell text-xs text-gray-400">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                <td className="table-cell text-gray-500 text-xs">{p.responsible}</td>
                <td className="table-cell text-center">
                  {p.status !== 'Resolvido' && (
                    <button onClick={() => resolve(p.id)} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-300 dark:border-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
