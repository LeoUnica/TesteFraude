import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import { Zap, CheckCircle, XCircle, Eye, EyeOff, Users, FileText, Shield } from 'lucide-react'

const INTEGRATION_TYPES = ['importacao', 'aprovacao', 'consulta', 'webhook']

type MainTab = 'storm' | 'pipeline' | 'outras'

export default function IntegrationsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('storm')

  // ─── Pipeline / conexões existentes ───────────────────────────────────────
  const [integrations, setIntegrations] = useState<any[]>([])
  const [pipelineConfigs, setPipelineConfigs] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'create' | 'edit' | 'pipeline' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ bank_id: '', type: 'importacao', api_url: '', api_key: '', username: '', password: '' })
  const [pipelineForm, setPipelineForm] = useState({ bank_id: '', days_import: '0', days_analysis: '0', days_checklist: '0', days_approval: '0', days_rejection: '0' })
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pipelineActiveTab, setPipelineActiveTab] = useState<'integrations' | 'pipeline'>('integrations')

  // ─── Storm Fin ─────────────────────────────────────────────────────────────
  const [stormCreds, setStormCreds] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [stormStatus, setStormStatus] = useState<'nao_configurado' | 'desconectado' | 'conectado'>('nao_configurado')
  const [stormTesting, setStormTesting] = useState(false)
  const [stormSaving, setStormSaving] = useState(false)
  const [stormError, setStormError] = useState('')
  const [stormSuccess, setStormSuccess] = useState('')
  const [stormStats, setStormStats] = useState<{ colaboradores?: number; contratos_dia?: number; antifraude_pendente?: number; rate_limit?: any } | null>(null)
  const [stormIntegId, setStormIntegId] = useState<string | null>(null)

  const loadPipeline = async () => {
    setLoading(true)
    try {
      const [intRes, pipRes] = await Promise.all([api.get('/integrations'), api.get('/integrations/pipeline-configs')])
      setIntegrations(intRes.data)
      setPipelineConfigs(pipRes.data)
    } catch {} finally { setLoading(false) }
  }

  const [stormUsername, setStormUsername] = useState<string | null>(null)

  const loadStorm = async () => {
    try {
      const res = await api.get('/integrations')
      const list: any[] = Array.isArray(res.data) ? res.data : []
      const storm = list.find((i: any) => (i.type ?? '').toLowerCase().includes('storm'))
      if (storm) {
        setStormIntegId(storm.id)
        const cfg = storm.config ?? {}
        setStormCreds({ username: cfg.username ?? storm.username ?? '', password: '' })
        setStormStatus('desconectado')
      }
    } catch {}

    try {
      const statsRes = await api.get('/stormfin/status')
      const d = statsRes.data
      if (d?.connected || d?.ok) {
        setStormStats(d)
        setStormStatus('conectado')
        setStormUsername(d.username ?? null)
      } else {
        setStormStatus('desconectado')
        setStormUsername(null)
      }
    } catch {
      setStormStatus('desconectado')
    }
  }

  useEffect(() => {
    loadPipeline()
    api.get('/banks').then(r => setBanks(r.data)).catch(() => {})
    loadStorm()
  }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await api.post('/integrations', form)
      else await api.put(`/integrations/${selected?.id}`, form)
      setModal(null); loadPipeline()
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleSavePipeline = async () => {
    setSaving(true)
    try {
      const payload = { bank_id: pipelineForm.bank_id, days_import: parseInt(pipelineForm.days_import), days_analysis: parseInt(pipelineForm.days_analysis), days_checklist: parseInt(pipelineForm.days_checklist), days_approval: parseInt(pipelineForm.days_approval), days_rejection: parseInt(pipelineForm.days_rejection) }
      await api.post('/integrations/pipeline-configs', payload)
      setModal(null); loadPipeline()
    } catch (e: any) { alert(e.response?.data?.error) }
    finally { setSaving(false) }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try { await api.patch(`/integrations/${id}/test`); loadPipeline() }
    catch { alert('Falha ao testar conexão') }
    finally { setTesting(null) }
  }

  // Storm actions
  const handleStormTest = async () => {
    setStormTesting(true)
    setStormError('')
    setStormSuccess('')
    try {
      const res = await api.post('/stormfin/testar-conexao', {
        username: stormCreds.username,
        password: stormCreds.password || undefined,
      })
      setStormStatus('conectado')
      setStormStats(res.data)
      setStormSuccess('Conexão com Storm Fin estabelecida com sucesso!')
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || 'Falha ao testar conexão com Storm.'
      setStormError(msg)
      setStormStatus('desconectado')
      setStormStats(null)
    } finally {
      setStormTesting(false)
    }
  }

  const handleStormSave = async () => {
    if (!stormCreds.username) { setStormError('Usuário é obrigatório.'); return }
    setStormSaving(true)
    setStormError('')
    setStormSuccess('')
    try {
      const payload: any = { username: stormCreds.username }
      if (stormCreds.password) payload.password = stormCreds.password
      const res = await api.post('/stormfin/salvar-credenciais', payload)
      setStormIntegId(res.data?.id ?? stormIntegId)
      setStormSuccess('Credenciais salvas com sucesso!')
      if (stormCreds.password) setStormCreds(c => ({ ...c, password: '' }))
    } catch (e: any) {
      setStormError(e.response?.data?.detail || e.response?.data?.error || 'Erro ao salvar credenciais.')
    } finally {
      setStormSaving(false)
    }
  }

  const stormStatusBadge = () => {
    if (stormStatus === 'conectado') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle size={12} />Conectado</span>
    if (stormStatus === 'desconectado') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><XCircle size={12} />Desconectado</span>
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Não configurado</span>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configuração de integrações e esteiras bancárias</p>
      </div>

      {/* Tabs principais */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {([['storm', 'Storm Fin'], ['pipeline', 'Pipeline'], ['outras', 'Outras']] as [MainTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── ABA STORM FIN ─────────────────────────────────────────────────── */}
      {mainTab === 'storm' && (
        <div className="space-y-4">

          {/* Banner de usuário conectado */}
          {stormStatus === 'conectado' && stormUsername && (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{stormUsername.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Conectado ao Storm Fin</div>
                <div className="text-base font-bold text-emerald-800 dark:text-emerald-300">{stormUsername}</div>
              </div>
              <CheckCircle size={22} className="ml-auto text-emerald-500 dark:text-emerald-400" />
            </div>
          )}

          {/* Config card */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap size={22} className="text-red-700 dark:text-red-400" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Storm Fin</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configuração de credenciais de acesso</p>
                </div>
              </div>
              {stormStatusBadge()}
            </div>

            {stormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
                {stormError}
              </div>
            )}
            {stormSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300">
                {stormSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário Storm *</label>
                <input
                  value={stormCreds.username}
                  onChange={e => setStormCreds(c => ({ ...c, username: e.target.value }))}
                  className="input-field"
                  placeholder="Login de acesso ao Storm"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Storm</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={stormCreds.password}
                    onChange={e => setStormCreds(c => ({ ...c, password: e.target.value }))}
                    className="input-field pr-10"
                    placeholder="Deixe em branco para manter a atual"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleStormTest}
                disabled={stormTesting || !stormCreds.username}
                className="btn-secondary inline-flex items-center gap-2"
              >
                {stormTesting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />Testando...</> : <><Zap size={15} />Testar Conexão</>}
              </button>
              <button
                onClick={handleStormSave}
                disabled={stormSaving || !stormCreds.username}
                className="btn-primary"
              >
                {stormSaving ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
            </div>
          </div>

          {/* Stats (quando conectado) */}
          {stormStatus === 'conectado' && stormStats && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Dados Storm</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="card p-4 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-3">
                  <Users size={20} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{stormStats.colaboradores ?? '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total de Colaboradores</div>
                  </div>
                </div>
                <div className="card p-4 border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 flex items-center gap-3">
                  <FileText size={20} className="text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{stormStats.contratos_dia ?? '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Contratos no Dia</div>
                  </div>
                </div>
                <div className="card p-4 border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 flex items-center gap-3">
                  <Shield size={20} className="text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{stormStats.antifraude_pendente ?? '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Antifraude Pendente</div>
                  </div>
                </div>
              </div>

              {stormStats.rate_limit && (
                <div className="card p-4 border border-gray-200 dark:border-gray-600 text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Limite de Requisições (Rate Limit)</div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {Object.entries(stormStats.rate_limit).map(([k, v]) => (
                      <div key={k}><span className="font-medium text-gray-700 dark:text-gray-300">{k}:</span> {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA PIPELINE ──────────────────────────────────────────────────── */}
      {mainTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => { setPipelineForm({ bank_id: '', days_import: '0', days_analysis: '0', days_checklist: '0', days_approval: '0', days_rejection: '0' }); setModal('pipeline') }} className="btn-secondary">⚙ Configurar Esteira</button>
              <button onClick={() => { setForm({ bank_id: '', type: 'importacao', api_url: '', api_key: '', username: '', password: '' }); setError(''); setSelected(null); setModal('create') }} className="btn-primary">+ Nova Integração</button>
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <button onClick={() => setPipelineActiveTab('integrations')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pipelineActiveTab === 'integrations' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>Conexões</button>
            <button onClick={() => setPipelineActiveTab('pipeline')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pipelineActiveTab === 'pipeline' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>Configurações de Esteira</button>
          </div>

          {pipelineActiveTab === 'integrations' && (
            <div className="card p-0 overflow-hidden">
              {loading ? <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"/></div> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="table-header text-left">Banco</th>
                      <th className="table-header text-left">Tipo</th>
                      <th className="table-header text-left">URL da API</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-left">Última Sync</th>
                      <th className="table-header text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrations.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400 dark:text-gray-500">Nenhuma integração configurada</td></tr>
                    ) : integrations.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="table-cell font-medium">{i.bank_name}</td>
                        <td className="table-cell"><span className="badge-info text-xs">{i.type}</span></td>
                        <td className="table-cell text-gray-500 text-xs font-mono">{i.api_url || '—'}</td>
                        <td className="table-cell text-center">{statusBadge(i.status)}</td>
                        <td className="table-cell text-xs text-gray-400">{i.last_sync ? new Date(i.last_sync).toLocaleString('pt-BR') : 'Nunca'}</td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleTest(i.id)} disabled={testing === i.id} className={`text-xs font-medium ${testing === i.id ? 'text-gray-400' : 'text-emerald-600 hover:text-emerald-800'}`}>{testing === i.id ? 'Testando...' : 'Testar'}</button>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <button onClick={() => { setSelected(i); setForm({ bank_id: i.bank_id, type: i.type, api_url: i.api_url || '', api_key: '', username: i.username || '', password: '' }); setError(''); setModal('edit') }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {pipelineActiveTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <strong>Esteiras:</strong> Configure o número de dias para cada fase do processamento bancário. A contagem começa quando a proposta entra na fase, não pela data de digitação.
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="table-header text-left">Banco</th>
                      <th className="table-header text-center">Importação (dias)</th>
                      <th className="table-header text-center">Análise (dias)</th>
                      <th className="table-header text-center">Checklist (dias)</th>
                      <th className="table-header text-center">Aprovação (dias)</th>
                      <th className="table-header text-center">Reprovação (dias)</th>
                      <th className="table-header text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineConfigs.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400 dark:text-gray-500">Nenhuma esteira configurada</td></tr>
                    ) : pipelineConfigs.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="table-cell font-medium">{p.bank_name}</td>
                        <td className="table-cell text-center">{p.days_import}</td>
                        <td className="table-cell text-center">{p.days_analysis}</td>
                        <td className="table-cell text-center">{p.days_checklist}</td>
                        <td className="table-cell text-center">{p.days_approval}</td>
                        <td className="table-cell text-center">{p.days_rejection}</td>
                        <td className="table-cell text-center">
                          <button onClick={() => { setPipelineForm({ bank_id: p.bank_id, days_import: String(p.days_import), days_analysis: String(p.days_analysis), days_checklist: String(p.days_checklist), days_approval: String(p.days_approval), days_rejection: String(p.days_rejection) }); setModal('pipeline') }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA OUTRAS ────────────────────────────────────────────────────── */}
      {mainTab === 'outras' && (
        <div className="card p-10 flex flex-col items-center text-center border-dashed">
          <div className="text-4xl mb-3">🔌</div>
          <div className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Outras Integrações</div>
          <p className="text-sm text-gray-400 dark:text-gray-500">Novas integrações serão disponibilizadas em breve.</p>
        </div>
      )}

      {/* Modal integração (pipeline) */}
      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Nova Integração' : 'Editar Integração'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Banco *</label>
            <select value={form.bank_id} onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))} className="input-field">
              <option value="">Selecione...</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
              {INTEGRATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">URL da API</label><input value={form.api_url} onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))} className="input-field" placeholder="https://..." /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Chave de API</label><input type="password" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Usuário</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Senha</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'pipeline'} onClose={() => setModal(null)} title="Configurar Esteira Bancária" size="md">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Banco *</label>
            <select value={pipelineForm.bank_id} onChange={e => setPipelineForm(f => ({ ...f, bank_id: e.target.value }))} className="input-field">
              <option value="">Selecione...</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['days_import', 'Importação'], ['days_analysis', 'Análise'], ['days_checklist', 'Checklist'], ['days_approval', 'Aprovação'], ['days_rejection', 'Reprovação']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label} (dias)</label>
                <input type="number" min="0" value={(pipelineForm as any)[key]} onChange={e => setPipelineForm(f => ({ ...f, [key]: e.target.value }))} className="input-field" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">* A contagem inicia quando a proposta entra na fase, não pela data de digitação</p>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSavePipeline} disabled={saving || !pipelineForm.bank_id} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>
    </div>
  )
}
