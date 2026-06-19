import { useState } from 'react'
import Modal from '../../components/ui/Modal'

const SYSTEM_FIELDS: Record<string, string[]> = {
  Propostas: ['cpf', 'client_name', 'value', 'installments', 'proposal_date', 'broker_code', 'convenio_name', 'bank_name', 'product_name', 'notes'],
  Corretores: ['code', 'name', 'cpf_cnpj', 'type', 'email', 'phone', 'group_name'],
}

interface ColumnMapping { fileColumn: string; systemField: string }
interface LayoutRecord {
  id: string; name: string; type: string; delimiter: string;
  hasHeader: boolean; columns: ColumnMapping[]; createdAt: string
}

const DELIMITERS = [
  { value: ',', label: 'Virgula (,)' },
  { value: ';', label: 'Ponto-virgula (;)' },
  { value: '\t', label: 'Tab (\\t)' },
]

const INITIAL_LAYOUTS: LayoutRecord[] = [
  { id: '1', name: 'Padrao Propostas CSV', type: 'Propostas', delimiter: ',', hasHeader: true, columns: [{ fileColumn: 'CPF', systemField: 'cpf' }, { fileColumn: 'NOME', systemField: 'client_name' }], createdAt: '2026-06-01' },
]

const EMPTY_FORM = { name: '', type: 'Propostas', delimiter: ',', hasHeader: true, columns: [{ fileColumn: '', systemField: '' }] }

export default function ImportLayoutPage() {
  const [layouts, setLayouts] = useState<LayoutRecord[]>(INITIAL_LAYOUTS)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<LayoutRecord | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, columns: [{ fileColumn: '', systemField: '' }] })
  const [error, setError] = useState('')

  const systemFields = SYSTEM_FIELDS[form.type] || []

  const setF = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const addColumn = () => setForm(f => ({ ...f, columns: [...f.columns, { fileColumn: '', systemField: '' }] }))
  const removeColumn = (i: number) => setForm(f => ({ ...f, columns: f.columns.filter((_, idx) => idx !== i) }))
  const setColumn = (i: number, key: 'fileColumn' | 'systemField', val: string) =>
    setForm(f => ({ ...f, columns: f.columns.map((c, idx) => idx === i ? { ...c, [key]: val } : c) }))

  const handleSave = () => {
    setError('')
    if (!form.name || !form.type) { setError('Nome e Tipo sao obrigatorios'); return }
    if (modal === 'create') {
      setLayouts(l => [...l, { ...form, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] }])
    } else if (selected) {
      setLayouts(l => l.map(x => x.id === selected.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este layout?')) return
    setLayouts(l => l.filter(x => x.id !== id))
  }

  const openEdit = (lay: LayoutRecord) => {
    setSelected(lay)
    setForm({ name: lay.name, type: lay.type, delimiter: lay.delimiter, hasHeader: lay.hasHeader, columns: lay.columns.length ? lay.columns : [{ fileColumn: '', systemField: '' }] })
    setError(''); setModal('edit')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mapeamento de Layout</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{layouts.length} layout(s) cadastrado(s)</p>
        </div>
        <button onClick={() => { setForm({ name: '', type: 'Propostas', delimiter: ',', hasHeader: true, columns: [{ fileColumn: '', systemField: '' }] }); setSelected(null); setError(''); setModal('create') }} className="btn-primary">
          + Novo Layout
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Nome</th>
              <th className="table-header text-left">Tipo</th>
              <th className="table-header text-left">Delimitador</th>
              <th className="table-header text-center">Cabecalho</th>
              <th className="table-header text-center">Colunas Mapeadas</th>
              <th className="table-header text-left">Criado em</th>
              <th className="table-header text-center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {layouts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum layout cadastrado</td></tr>
            ) : layouts.map(l => (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="table-cell font-medium">{l.name}</td>
                <td className="table-cell"><span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">{l.type}</span></td>
                <td className="table-cell font-mono text-xs">{DELIMITERS.find(d => d.value === l.delimiter)?.label || l.delimiter}</td>
                <td className="table-cell text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.hasHeader ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {l.hasHeader ? 'Sim' : 'Nao'}
                  </span>
                </td>
                <td className="table-cell text-center font-medium text-blue-600">{l.columns.filter(c => c.fileColumn && c.systemField).length}</td>
                <td className="table-cell text-gray-400 text-xs">{l.createdAt}</td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(l)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDelete(l.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Layout' : 'Editar Layout'} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Layout *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)} className="input-field" placeholder="Ex: Padrao Propostas CSV" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => setF('type', e.target.value)} className="input-field">
                <option value="Propostas">Propostas</option>
                <option value="Corretores">Corretores</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Delimitador</label>
              <select value={form.delimiter} onChange={e => setF('delimiter', e.target.value)} className="input-field">
                {DELIMITERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Linha de Cabecalho</label>
              <select value={form.hasHeader ? 'sim' : 'nao'} onChange={e => setF('hasHeader', e.target.value === 'sim')} className="input-field">
                <option value="sim">Sim</option>
                <option value="nao">Nao</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Mapeamento de Colunas</label>
              <button onClick={addColumn} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar coluna</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {form.columns.map((col, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={col.fileColumn} onChange={e => setColumn(i, 'fileColumn', e.target.value)}
                    className="input-field flex-1 text-xs" placeholder="Coluna no arquivo"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <select value={col.systemField} onChange={e => setColumn(i, 'systemField', e.target.value)} className="input-field flex-1 text-xs">
                    <option value="">Campo do sistema</option>
                    {systemFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button onClick={() => removeColumn(i)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar Layout</button>
        </div>
      </Modal>
    </div>
  )
}
