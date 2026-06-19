import { useState } from 'react'
import Modal from '../../components/ui/Modal'

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'corretores', label: 'Corretores' },
  { key: 'propostas', label: 'Propostas' },
  { key: 'antifraude', label: 'Antifraude' },
  { key: 'importacoes', label: 'Importacoes' },
  { key: 'administracao', label: 'Administracao' },
  { key: 'relatorios', label: 'Relatorios' },
  { key: 'auditoria', label: 'Auditoria' },
]

interface Profile {
  id: string; name: string; description: string;
  users: number; permissions: string[]
}

const INITIAL: Profile[] = [
  { id: '1', name: 'Administrador', description: 'Acesso total ao sistema', users: 2, permissions: MODULES.map(m => m.key) },
  { id: '2', name: 'Analista de Credito', description: 'Acesso a propostas e antifraude', users: 5, permissions: ['dashboard', 'propostas', 'antifraude'] },
  { id: '3', name: 'Operador', description: 'Acesso a corretores e importacoes', users: 8, permissions: ['dashboard', 'corretores', 'importacoes'] },
]

const EMPTY_FORM = { name: '', description: '', permissions: [] as string[] }

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [error, setError] = useState('')

  const togglePerm = (key: string) =>
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key]
    }))

  const handleSave = () => {
    setError('')
    if (!form.name) { setError('Nome do perfil e obrigatorio'); return }
    if (modal === 'create') {
      setProfiles(p => [...p, { ...form, id: Date.now().toString(), users: 0 }])
    } else if (selected) {
      setProfiles(p => p.map(x => x.id === selected.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este perfil?')) return
    setProfiles(p => p.filter(x => x.id !== id))
  }

  const openEdit = (p: Profile) => {
    setSelected(p)
    setForm({ name: p.name, description: p.description, permissions: [...p.permissions] })
    setError(''); setModal('edit')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Perfis de Acesso</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profiles.length} perfil(is) cadastrado(s)</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM, permissions: [] }); setSelected(null); setError(''); setModal('create') }} className="btn-primary">
          + Novo Perfil
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <th className="table-header text-left">Nome</th>
              <th className="table-header text-left">Descricao</th>
              <th className="table-header text-center">Usuarios</th>
              <th className="table-header text-left">Permissoes</th>
              <th className="table-header text-center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="table-cell font-semibold">{p.name}</td>
                <td className="table-cell text-gray-500">{p.description}</td>
                <td className="table-cell text-center">
                  <span className="font-medium text-blue-600">{p.users}</span>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {p.permissions.map(perm => (
                      <span key={perm} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        {MODULES.find(m => m.key === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Perfil de Acesso' : 'Editar Perfil'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Perfil *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Ex: Analista de Credito" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descricao</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Descricao do perfil" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Permissoes de Acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map(m => (
                <label key={m.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(m.key)}
                    onChange={() => togglePerm(m.key)}
                    className="w-4 h-4 text-red-700 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setForm(f => ({ ...f, permissions: form.permissions.length === MODULES.length ? [] : MODULES.map(m => m.key) }))}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {form.permissions.length === MODULES.length ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">Salvar Perfil</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
