import { useState } from 'react'
import Modal from '../../components/ui/Modal'

const FIELD_TYPES = ['CPF', 'Nome', 'Banco', 'Convenio', 'Produto', 'Status', 'Tipo', 'Generico']
const LAYOUTS = ['Padrao Propostas CSV', 'Padrao Corretores XLSX', 'Todos']

interface DataMapping {
  id: string; from: string; to: string; fieldType: string; applyIn: string; active: boolean
}

const INITIAL: DataMapping[] = [
  { id: '1', from: 'CAIXA', to: 'Caixa Economica Federal', fieldType: 'Banco', applyIn: 'Todos', active: true },
  { id: '2', from: 'INSS', to: 'Instituto Nacional do Seguro Social', fieldType: 'Convenio', applyIn: 'Padrao Propostas CSV', active: true },
  { id: '3', from: 'AP', to: 'Aprovada', fieldType: 'Status', applyIn: 'Todos', active: false },
]

const EMPTY_FORM = { from: '', to: '', fieldType: 'Generico', applyIn: 'Todos', active: true }

export default function ImportDataMapPage() {
  const [mappings, setMappings] = useState<DataMapping[]>(INITIAL)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<DataMapping | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [error, setError] = useState('')

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    setError('')
    if (!form.from || !form.to) { setError('Valor original e valor mapeado sao obrigatorios'); return }
    if (modal === 'create') {
      setMappings(m => [...m, { ...form, id: Date.now().toString() }])
    } else if (selected) {
      setMappings(m => m.map(x => x.id === selected.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  const handleToggle = (m: DataMapping) =>
    setMappings(prev => prev.map(x => x.id === m.id ? { ...x, active: !x.active } : x))

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este mapeamento?')) return
    setMappings(m => m.filter(x => x.id !== id))
  }

  const openEdit = (m: DataMapping) => {
    setSelected(m)
    setForm({ from: m.from, to: m.to, fieldType: m.fieldType, applyIn: m.applyIn, active: m.active })
    setError(''); setModal('edit')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mapeamento de Dados</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{mappings.length} mapeamento(s) configurado(s)</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setSelected(null); setError(''); setModal('create') }} className="btn-primary">
          + Novo Mapeamento
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">De (Valor Original)</th>
              <th className="table-header text-left">Para (Valor Mapeado)</th>
              <th className="table-header text-left">Tipo de Campo</th>
              <th className="table-header text-left">Aplicar em</th>
              <th className="table-header text-center">Ativo</th>
              <th className="table-header text-center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum mapeamento configurado</td></tr>
            ) : mappings.map(m => (
              <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!m.active ? 'opacity-50' : ''}`}>
                <td className="table-cell font-mono text-xs text-gray-700 dark:text-gray-300">{m.from}</td>
                <td className="table-cell font-mono text-xs text-emerald-700 dark:text-emerald-400">{m.to}</td>
                <td className="table-cell">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">{m.fieldType}</span>
                </td>
                <td className="table-cell text-gray-500 text-xs">{m.applyIn}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.active ? 'Sim' : 'Nao'}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleToggle(m)} className={`text-xs font-medium ${m.active ? 'text-gray-500 hover:text-gray-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                      {m.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Mapeamento de Dados' : 'Editar Mapeamento'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Original *</label>
              <input value={form.from} onChange={e => set('from', e.target.value)} className="input-field" placeholder="Ex: CAIXA" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Mapeado *</label>
              <input value={form.to} onChange={e => set('to', e.target.value)} className="input-field" placeholder="Ex: Caixa Economica Federal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Campo</label>
              <select value={form.fieldType} onChange={e => set('fieldType', e.target.value)} className="input-field">
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Aplicar em Layout</label>
              <select value={form.applyIn} onChange={e => set('applyIn', e.target.value)} className="input-field">
                {LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.active ? 'ativo' : 'inativo'} onChange={e => set('active', e.target.value === 'ativo')} className="input-field">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar Mapeamento</button>
        </div>
      </Modal>
    </div>
  )
}
