import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react'

type Tab = 'fgts' | 'clt'

interface SimResult {
  valor_liberado?: number
  parcelas_disponiveis?: any[]
  taxa?: number
  tabela?: { prazo: number; parcela: number; valor: number }[]
  [key: string]: any
}

const fmt = (v: any) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmtCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

export default function StormSimulacaoPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('fgts')
  const [bancos, setBancos] = useState<any[]>([])
  const [stormError, setStormError] = useState('')

  // FGTS form
  const [fgts, setFgts] = useState({ cpf: '', banco: '' })
  const [fgtsCliente, setFgtsCliente] = useState<string | null>(null)
  const [fgtsClienteStatus, setFgtsClienteStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')

  // CLT form
  const [clt, setClt] = useState({ cpf: '', banco: '', valor: '', matricula: '' })

  // Simulação
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError] = useState('')
  const [simResult, setSimResult] = useState<SimResult | null>(null)

  useEffect(() => {
    api.get('/stormfin/bancos').then(r => {
      const d = r.data
      setBancos(Array.isArray(d) ? d : d.items ?? d.data ?? [])
    }).catch((e: any) => {
      const msg = e.response?.data?.detail || e.response?.data?.error || ''
      if (msg.toLowerCase().includes('configur') || msg.toLowerCase().includes('credencial') || e.response?.status === 503 || e.response?.status === 401) {
        setStormError('Integração Storm não configurada. Configure as credenciais em Integrações.')
      }
    })
  }, [])

  const buscarClienteFGTS = async () => {
    const cpf = fgts.cpf.replace(/\D/g, '')
    if (cpf.length !== 11) return
    setFgtsClienteStatus('loading')
    setFgtsCliente(null)
    try {
      const res = await api.get(`/stormfin/clientes/cpf/${cpf}`)
      const nome = res.data?.nome ?? res.data?.name ?? res.data?.client_name ?? null
      setFgtsCliente(nome)
      setFgtsClienteStatus(nome ? 'found' : 'not_found')
    } catch {
      setFgtsClienteStatus('not_found')
      setFgtsCliente(null)
    }
  }

  const simularFGTS = async () => {
    setSimulating(true)
    setSimError('')
    setSimResult(null)
    try {
      const res = await api.post('/stormfin/simular/fgts', {
        cpf: fgts.cpf.replace(/\D/g, ''),
        banco: fgts.banco,
      })
      setSimResult(res.data)
    } catch (e: any) {
      setSimError(e.response?.data?.detail || e.response?.data?.error || 'Erro ao realizar simulação.')
    } finally {
      setSimulating(false)
    }
  }

  const simularCLT = async () => {
    setSimulating(true)
    setSimError('')
    setSimResult(null)
    try {
      const res = await api.post('/stormfin/simular/clt', {
        cpf: clt.cpf.replace(/\D/g, ''),
        banco: clt.banco,
        valor: parseFloat(clt.valor),
        matricula: clt.matricula,
      })
      setSimResult(res.data)
    } catch (e: any) {
      setSimError(e.response?.data?.detail || e.response?.data?.error || 'Erro ao realizar simulação.')
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Zap size={24} className="text-red-700 dark:text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Simulação Storm</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Simulador integrado com a plataforma Storm Fin</p>
        </div>
      </div>

      {/* Banner Storm Error */}
      {stormError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span className="flex-1">{stormError}</span>
          <button onClick={() => navigate('/integracoes')} className="ml-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors">
            Configurar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['fgts', 'clt'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSimResult(null); setSimError('') }}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Formulário */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {tab === 'fgts' ? 'Simulação FGTS' : 'Simulação CLT'}
          </h2>

          {tab === 'fgts' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                <input
                  value={fgts.cpf}
                  onChange={e => {
                    const v = fmtCPF(e.target.value)
                    setFgts(f => ({ ...f, cpf: v.length <= 14 ? v : f.cpf }))
                    setFgtsCliente(null)
                    setFgtsClienteStatus('idle')
                  }}
                  onBlur={buscarClienteFGTS}
                  className="input-field"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {fgtsClienteStatus === 'loading' && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500" />
                    Buscando cliente no Storm...
                  </div>
                )}
                {fgtsClienteStatus === 'found' && fgtsCliente && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle size={12} />
                    Cliente encontrado: <strong>{fgtsCliente}</strong>
                  </div>
                )}
                {fgtsClienteStatus === 'not_found' && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Cliente não encontrado no Storm.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Banco *</label>
                <select value={fgts.banco} onChange={e => setFgts(f => ({ ...f, banco: e.target.value }))} className="input-field">
                  <option value="">Selecione o banco...</option>
                  {bancos.map((b, i) => (
                    <option key={b.id ?? b.codigo ?? i} value={b.id ?? b.codigo ?? b.nome}>{b.nome ?? b.name ?? b.descricao ?? b}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={simularFGTS}
                disabled={simulating || !fgts.cpf || !fgts.banco}
                className="btn-primary w-full"
              >
                {simulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Simulando...
                  </span>
                ) : 'Simular FGTS'}
              </button>
            </>
          )}

          {tab === 'clt' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                <input
                  value={clt.cpf}
                  onChange={e => {
                    const v = fmtCPF(e.target.value)
                    setClt(f => ({ ...f, cpf: v.length <= 14 ? v : f.cpf }))
                  }}
                  className="input-field"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Banco *</label>
                <select value={clt.banco} onChange={e => setClt(f => ({ ...f, banco: e.target.value }))} className="input-field">
                  <option value="">Selecione o banco...</option>
                  {bancos.map((b, i) => (
                    <option key={b.id ?? b.codigo ?? i} value={b.id ?? b.codigo ?? b.nome}>{b.nome ?? b.name ?? b.descricao ?? b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor Solicitado (R$) *</label>
                <input
                  type="number" step="0.01" min="0"
                  value={clt.valor}
                  onChange={e => setClt(f => ({ ...f, valor: e.target.value }))}
                  className="input-field"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Matrícula *</label>
                <input
                  value={clt.matricula}
                  onChange={e => setClt(f => ({ ...f, matricula: e.target.value }))}
                  className="input-field"
                  placeholder="Número de matrícula"
                />
              </div>

              <button
                onClick={simularCLT}
                disabled={simulating || !clt.cpf || !clt.banco || !clt.valor || !clt.matricula}
                className="btn-primary w-full"
              >
                {simulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Simulando...
                  </span>
                ) : 'Simular CLT'}
              </button>
            </>
          )}
        </div>

        {/* Resultado */}
        <div className="space-y-4">
          {simError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
              {simError}
            </div>
          )}

          {simResult && (
            <div className="space-y-4">
              {/* Cards de resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {simResult.valor_liberado != null && (
                  <div className="card p-4 border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Liberado</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(simResult.valor_liberado)}</div>
                  </div>
                )}
                {simResult.taxa != null && (
                  <div className="card p-4 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Taxa</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{simResult.taxa}%</div>
                  </div>
                )}
                {simResult.parcelas_disponiveis && (
                  <div className="card p-4 border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Parcelas Disponíveis</div>
                    <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                      {Array.isArray(simResult.parcelas_disponiveis) ? simResult.parcelas_disponiveis.length : simResult.parcelas_disponiveis}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela de opções */}
              {simResult.tabela && simResult.tabela.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Opções de Parcelamento</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                          <th className="table-header text-center">Prazo</th>
                          <th className="table-header text-right">Parcela</th>
                          <th className="table-header text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResult.tabela.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                            <td className="table-cell text-center font-medium">{row.prazo}x</td>
                            <td className="table-cell text-right">{fmt(row.parcela)}</td>
                            <td className="table-cell text-right text-emerald-700 dark:text-emerald-300 font-medium">{fmt(row.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Demais dados da simulação */}
              {Object.entries(simResult).filter(([k]) => !['valor_liberado', 'taxa', 'parcelas_disponiveis', 'tabela'].includes(k)).length > 0 && (
                <div className="card p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Detalhes da Simulação</h3>
                  {Object.entries(simResult).filter(([k]) => !['valor_liberado', 'taxa', 'parcelas_disponiveis', 'tabela'].includes(k)).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm border-b border-gray-100 dark:border-gray-700 pb-1 last:border-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase w-36 flex-shrink-0">{k}</span>
                      <span className="text-gray-900 dark:text-gray-100">{String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!simResult && !simError && !simulating && (
            <div className="card p-8 flex flex-col items-center justify-center text-center border-dashed">
              <Zap size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Preencha o formulário e clique em Simular para ver os resultados.</p>
            </div>
          )}

          {simulating && (
            <div className="card p-8 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Processando simulação no Storm Fin...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
