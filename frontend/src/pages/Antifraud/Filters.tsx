import { useState } from 'react'
import Modal from '../../components/ui/Modal'

const TYPES = ['CPF', 'Nome', 'Convenio', 'Banco', 'Valor']
const OPERATORS = ['igual', 'contem', 'maior que', 'menor que']
const ACTIONS = ['bloquear', 'sinalizar', 'aprovar']

interface Filter {
  id: string; name: string; type: string; operator: string;
  value: string; action: string; status: 'ativo' | 'inativo'
}

const ACTION_COLORS: Record<string, string> = {
  bloquear: 'bg-red-100 text-red-700',
  sinalizar: 'bg-amber-100 text-amber-700',
  aprovar: 'bg-emerald-100 text-emerald-700',
}

const INITIAL: Filter[] = [
  { id: '1', name: 'Bloquear CPF negativado', type: 'CPF', operator: 'igual', value: '000.000.000-00', action: 'bloquear', status: 'ativo' },
  { id: '2', name: 'Valor alto suspeito', type: 'Valor', operator: 'maior que', value: '50000', action: 'sinalizar', status: 'ativo' },
]

const EMPTY_FORM = { name: '', type: 'CPF', operator: 'igual', value: '', action: 'sinalizar', status: 'ativo' as const }

export default function AntifraudFiltersPage() {
  const [filters, setFilters] = useState<Filter[]>(INITIAL)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Filter | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [error, setError] = useState('')

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    setError('')
    if (!form.name || !form.value) { setError('Nome e Valor sao obrigatorios'); return }
    if (modal === 'create') {
      const newFilter: Filter = { ...form, id: Date.now().toString() }
      setFilters(f => [...f, newFilter])
    } else if (selected) {
      setFilters(f => f.map(x => x.id === selected.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  const handleToggle = (f: Filter) => {
    setFilters(prev => prev.map(x => x.id === f.id ? { ...x, status: x.status === 'ativo' ? 'inativo' : 'ativo' } : x))
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este filtro?')) return
    setFilters(f => f.filter(x => x.id !== id))
  }

  const openEdit = (f: Filter) => {
    setSelected(f)
    setForm({ name: f.name, type: f.type, operator: f.operator, value: f.value, action: f.action, status: f.status as 'ativo' })
    setError('')
    setModal('edit')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Filtros Antifraude</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filters.length} filtro(s) configurado(s)</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setSelected(null); setError(''); setModal('create') }}
          className="btn-primary"
        >
          + Novo Filtro
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Nome</th>
              <th className="table-header text-left">Tipo</th>
              <th className="table-header text-left">Operador</th>
              <th className="table-header text-left">Valor</th>
              <th className="table-header text-center">Acao</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filters.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum filtro configurado</td></tr>
            ) : filters.map(f => (
              <tr key={f.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${f.status === 'inativo' ? 'opacity-50' : ''}`}>
                <td className="table-cell font-medium">{f.name}</td>
                <td className="table-cell">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-medium">{f.type}</span>
                </td>
                <td className="table-cell text-gray-500">{f.operator}</td>
                <td className="table-cell font-mono text-xs">{f.value}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${ACTION_COLORS[f.action] || 'bg-gray-100 text-gray-700'}`}>
                    {f.action}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${f.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.status}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <button onClick={() => openEdit(f)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleToggle(f)} className={`text-xs font-medium ${f.status === 'ativo' ? 'text-gray-500 hover:text-gray-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                      {f.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Filtro Antifraude' : 'Editar Filtro'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Filtro *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Ex: Bloquear CPF negativado" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Operador *</label>
              <select value={form.operator} onChange={e => set('operator', e.target.value)} className="input-field">
                {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor de Referencia *</label>
            <input value={form.value} onChange={e => set('value', e.target.value)} className="input-field" placeholder="Ex: 000.000.000-00 ou 50000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Acao</label>
              <select value={form.action} onChange={e => set('action', e.target.value)} className="input-field">
                {ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar Filtro</button>
        </div>
      </Modal>
    </div>
  )
}
