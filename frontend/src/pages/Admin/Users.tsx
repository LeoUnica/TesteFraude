import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['Administrador Master', 'Supervisor', 'Analista Antifraude', 'Mesa de Credito', 'Operador', 'Gestor']
const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'corretores', label: 'Corretores' },
  { key: 'grupos', label: 'Grupos de Corretores' },
  { key: 'propostas', label: 'Propostas' },
  { key: 'antifraude', label: 'Antifraude' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'convenios', label: 'Convênios' },
  { key: 'bancos', label: 'Bancos' },
  { key: 'integracoes', label: 'Integrações' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'usuarios', label: 'Usuários' },
]

const EMPTY_FORM = { name: '', email: '', username: '', password: '', role: 'Operador', permissions: {} as Record<string, boolean> }

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | 'reset' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [resetPassword, setResetPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isAdmin()) return <div className="card text-center py-10 text-gray-500">Acesso restrito ao Administrador Master</div>

  const load = async () => {
    setLoading(true)
    try { const res = await api.get('/users'); setUsers(res.data) } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setError(''); setSelected(null); setModal('create') }
  const openEdit = (u: any) => {
    setSelected(u)
    setForm({ name: u.name, email: u.email, username: u.username, password: '', role: u.role, permissions: {} })
    api.get('/users').then(r => {
      const full = r.data.find((x: any) => x.id === u.id)
    }).catch(() => {})
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form }
      if (!payload.password) delete (payload as any).password
      if (modal === 'create') await api.post('/users', payload)
      else await api.put(`/users/${selected?.id}`, payload)
      setModal(null); load()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleToggle = async (u: any) => {
    await api.patch(`/users/${u.id}/toggle-status`); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir usuário permanentemente?')) return
    try { await api.delete(`/users/${id}`); load() } catch (e: any) { alert(e.response?.data?.error) }
  }

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 8) { setError('Senha mínima de 8 caracteres'); return }
    setSaving(true)
    try { await api.patch(`/users/${selected?.id}/reset-password`, { newPassword: resetPassword }); setModal(null) }
    catch (e: any) { setError(e.response?.data?.error) }
    finally { setSaving(false) }
  }

  const togglePerm = (key: string) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-sm text-gray-500">{users.length} usuário(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Novo Usuário</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header text-left">Nome</th>
                <th className="table-header text-left">E-mail</th>
                <th className="table-header text-left">Usuário</th>
                <th className="table-header text-left">Perfil</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-left">Último Acesso</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-medium">{u.name}</td>
                  <td className="table-cell text-gray-500">{u.email}</td>
                  <td className="table-cell font-mono text-xs text-blue-700">{u.username}</td>
                  <td className="table-cell"><span className="badge-info text-xs">{u.role}</span></td>
                  <td className="table-cell text-center">{statusBadge(u.status)}</td>
                  <td className="table-cell text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : 'Nunca'}</td>
                  <td className="table-cell text-center">
                    {u.role !== 'Administrador Master' && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => { setSelected(u); setResetPassword(''); setError(''); setModal('reset') }} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Senha</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => handleToggle(u)} className={`text-xs font-medium ${u.status === 'ativo' ? 'text-red-500' : 'text-emerald-600'}`}>{u.status === 'ativo' ? 'Bloquear' : 'Ativar'}</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
                      </div>
                    )}
                    {u.role === 'Administrador Master' && <span className="text-xs text-gray-400 italic">Master</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Usuário' : 'Editar Usuário'} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">E-mail *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Usuário *</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">{modal === 'create' ? 'Senha *' : 'Nova Senha (deixe em branco para manter)'}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="Mín. 8 caracteres" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Perfil *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
              {ROLES.filter(r => r !== 'Administrador Master').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Permissões de Acesso</label>
          <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
            {ALL_PERMISSIONS.map(p => (
              <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.permissions[p.key]} onChange={() => togglePerm(p.key)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'reset'} onClose={() => setModal(null)} title="Redefinir Senha" size="sm">
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <p className="text-sm text-gray-600 mb-3">Redefinir senha para: <strong>{selected?.name}</strong></p>
        <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="input-field" placeholder="Nova senha (mín. 8 caracteres)" />
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleResetPassword} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Redefinir'}</button>
        </div>
      </Modal>
    </div>
  )
}
