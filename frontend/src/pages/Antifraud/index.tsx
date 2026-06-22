import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import api from '../../services/api'
import Modal from '../../components/ui/Modal'
import { statusBadge } from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

const ANALYSIS_STATUSES = [
  'Aprovada no Banco',
  'Reprovar no Banco',
  'Suspeita de Antifraude',
  'Em Analise',
  'Nao Mapeada',
  'Agendar para acompanhamento',
]

const CARDS = [
  { key: 'analisar', label: 'Analisar', icon: '🔍', color: 'bg-purple-50 dark:bg-purple-900/20', status: 'Em Analise', countKey: 'inAnalysis', valueKey: 'inAnalysisValue', subtitle: 'Blacklist / passa na esteira' },
  { key: 'aprovadas_banco', label: 'Aprovadas no Banco', icon: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/20', status: 'Aprovada no Banco', countKey: 'approvedAuto', valueKey: 'approvedAutoValue', subtitle: 'Dentro do banco' },
  { key: 'nao_mapeadas', label: 'Não Mapeadas', icon: '🗂️', color: 'bg-yellow-50 dark:bg-yellow-900/20', status: 'Nao Mapeada', countKey: 'notMapped', valueKey: 'notMappedValue', subtitle: 'Mapeamento de convênios' },
  { key: 'reprovar_banco', label: 'Reprovar no Banco', icon: '❌', color: 'bg-red-50 dark:bg-red-900/20', status: 'Reprovar no Banco', countKey: 'rejected', valueKey: 'rejectedValue', subtitle: 'Reprovação bancária' },
  { key: 'suspeita_antifraude', label: 'Suspeita de Antifraude', icon: '🚨', color: 'bg-amber-50 dark:bg-amber-900/20', status: 'Suspeita de Antifraude', countKey: 'fraudSuspect', valueKey: 'fraudSuspectValue', subtitle: 'Triagem antifraude' },
  { key: 'agendar_acompanhamento', label: 'Agendar para Acompanhamento', icon: '📅', color: 'bg-sky-50 dark:bg-sky-900/20', status: 'Agendar para acompanhamento', countKey: 'scheduled', valueKey: 'scheduledValue', subtitle: 'Agendado' },
]

const EXPORT_HEADERS = ['Banco', 'COD_OPERACAO', 'CPF/CNPJ', 'VALOR', 'NOME_REGRA', 'DATA', 'ULTIMO_OBS']

function rowsToExcel(rows: any[]): any[][] {
  return rows.map(p => [
    p.bank_name || '',
    p.code || '',
    p.cpf || '',
    p.value != null ? p.value : '',
    p.antifraud_status || '',
    p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
    p.last_notes || '',
  ])
}

function exportToExcel(rows: any[], filename: string) {
  const data = [EXPORT_HEADERS, ...rowsToExcel(rows)]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [20, 18, 16, 14, 28, 12, 40].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx')
}

function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[])
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function ProposalTable({
  proposals,
  onAnalyze,
  emptyMessage = 'Nenhuma proposta encontrada',
}: {
  proposals: any[]
  onAnalyze?: (p: any) => void
  emptyMessage?: string
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <th className="table-header text-left">Banco</th>
          <th className="table-header text-left">COD_OPERACAO</th>
          <th className="table-header text-left">CPF/CNPJ</th>
          <th className="table-header text-left">Cliente</th>
          <th className="table-header text-right">VALOR</th>
          <th className="table-header text-center">NOME_REGRA</th>
          <th className="table-header text-left">DATA</th>
          <th className="table-header text-left">ULTIMO_OBS</th>
          {onAnalyze && <th className="table-header text-center">Ação</th>}
        </tr>
      </thead>
      <tbody>
        {proposals.length === 0 ? (
          <tr>
            <td colSpan={onAnalyze ? 9 : 8} className="text-center py-12">
              <div className="text-4xl mb-2">📋</div>
              <div className="text-gray-500">{emptyMessage}</div>
            </td>
          </tr>
        ) : proposals.map((p: any, i: number) => (
          <tr key={p.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <td className="table-cell text-gray-600 dark:text-gray-400">{p.bank_name || '—'}</td>
            <td className="table-cell font-mono text-xs text-blue-700 dark:text-blue-400">{p.code || p.COD_OPERACAO || '—'}</td>
            <td className="table-cell font-mono text-xs">{p.cpf || p['CPF/CNPJ'] || '—'}</td>
            <td className="table-cell"><div className="font-medium">{p.client_name || '—'}</div></td>
            <td className="table-cell text-right font-medium">
              {p.value != null
                ? p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : p.VALOR || '—'}
            </td>
            <td className="table-cell text-center">{statusBadge(p.antifraud_status || p.NOME_REGRA || 'Nao Analisado')}</td>
            <td className="table-cell text-xs text-gray-400">
              {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : p.DATA || '—'}
            </td>
            <td className="table-cell text-xs text-gray-500 max-w-[200px] truncate" title={p.last_notes || p.ULTIMO_OBS || ''}>
              {p.last_notes || p.ULTIMO_OBS || '—'}
            </td>
            {onAnalyze && (
              <td className="table-cell text-center">
                <button onClick={() => onAnalyze(p)} className="btn-primary py-1.5 text-xs">Analisar</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TableHeader({
  title,
  count,
  icon,
  onExport,
  onImport,
  onClose,
  colorClass = 'bg-amber-50 dark:bg-amber-900/20',
  textClass = 'text-amber-800 dark:text-amber-400',
}: {
  title: string
  count: number
  icon?: string
  onExport: () => void
  onImport?: () => void
  onClose?: () => void
  colorClass?: string
  textClass?: string
}) {
  return (
    <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${colorClass} flex items-center justify-between gap-2`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
        <span className={`text-sm font-semibold ${textClass} truncate`}>{title}</span>
        <span className={`text-xs ${textClass} opacity-70 flex-shrink-0`}>— {count} proposta(s)</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onImport && (
          <button
            onClick={onImport}
            className="btn-secondary py-1.5 text-xs flex items-center gap-1"
          >
            📤 Importar Excel
          </button>
        )}
        <button
          onClick={onExport}
          className="btn-secondary py-1.5 text-xs flex items-center gap-1"
        >
          📥 Exportar Excel
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default function AntifraudPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page] = useState(1)
  const [modal, setModal] = useState<'analysis' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [analysisForm, setAnalysisForm] = useState({ status: '', notes: '', schedule_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<any>({})

  const [selectedCard, setSelectedCard] = useState<typeof CARDS[0] | null>(null)
  const [cardProposals, setCardProposals] = useState<any[]>([])
  const [cardLoading, setCardLoading] = useState(false)

  // Import state
  const [importTarget, setImportTarget] = useState<'queue' | 'card' | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importParsing, setImportParsing] = useState(false)
  const [importSending, setImportSending] = useState(false)
  const [importResult, setImportResult] = useState<{ updated: number; not_found: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/antifraud/queue?page=${page}&per_page=20`)
      setProposals(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard')
      setStats(res.data)
    } catch {}
  }

  const loadCardProposals = async (status: string) => {
    setCardLoading(true)
    try {
      const res = await api.get(`/antifraud/proposals?antifraud_status=${encodeURIComponent(status)}&per_page=500`)
      setCardProposals(res.data.data || [])
    } catch {} finally { setCardLoading(false) }
  }

  useEffect(() => { load(); loadStats() }, [page])

  const handleCardClick = (card: typeof CARDS[0]) => {
    if (selectedCard?.key === card.key) {
      setSelectedCard(null)
      setCardProposals([])
    } else {
      setSelectedCard(card)
      loadCardProposals(card.status)
    }
  }

  const openAnalysis = (p: any) => {
    setSelected(p)
    setAnalysisForm({ status: '', notes: '', schedule_date: '' })
    setError('')
    setModal('analysis')
  }

  const handleSaveAnalysis = async () => {
    if (!analysisForm.status) { setError('Selecione um status'); return }
    setSaving(true); setError('')
    try {
      await api.post('/antifraud/analyses', { proposal_id: selected.id, ...analysisForm })
      setModal(null); load(); loadStats()
      if (selectedCard) loadCardProposals(selectedCard.status)
    } catch (e: any) { setError(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const quickAction = (status: string) => setAnalysisForm((f) => ({ ...f, status }))

  // Import helpers
  const openImport = (target: 'queue' | 'card') => {
    setImportTarget(target)
    setImportPreview([])
    setImportResult(null)
    setImportError('')
    setImportParsing(false)
    setImportSending(false)
  }

  const closeImport = () => setImportTarget(null)

  const handleFile = async (file: File) => {
    if (!file) return
    setImportParsing(true)
    setImportError('')
    setImportResult(null)
    try {
      const rows = await parseExcelFile(file)
      setImportPreview(rows)
    } catch {
      setImportError('Erro ao ler o arquivo. Certifique-se que é um .xlsx ou .csv válido.')
    } finally { setImportParsing(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return
    setImportSending(true)
    setImportError('')
    try {
      const res = await api.post('/antifraud/proposals/import', { rows: importPreview })
      setImportResult(res.data)
      load(); loadStats()
      if (selectedCard) loadCardProposals(selectedCard.status)
    } catch (e: any) {
      setImportError(e.response?.data?.detail || 'Erro ao importar.')
    } finally { setImportSending(false) }
  }

  const importModalOpen = importTarget !== null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mesa de Crédito — Antifraude</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Análise e validação de propostas suspeitas</p>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CARDS.map(card => (
          <button
            key={card.key}
            onClick={() => handleCardClick(card)}
            className={`text-left rounded-xl transition-all focus:outline-none ${
              selectedCard?.key === card.key
                ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 hover:ring-offset-2 hover:ring-offset-gray-50 dark:hover:ring-offset-gray-900'
            }`}
          >
            <StatCard
              title={card.label}
              value={stats[card.countKey] ?? 0}
              amount={stats[card.valueKey] ?? 0}
              icon={card.icon}
              color={card.color}
              subtitle={card.subtitle}
            />
          </button>
        ))}
      </div>

      {/* Tabela do card selecionado */}
      {selectedCard && (
        <div className="card p-0 overflow-hidden">
          <TableHeader
            title={selectedCard.label}
            count={cardProposals.length}
            icon={selectedCard.icon}
            colorClass="bg-blue-50 dark:bg-blue-900/20"
            textClass="text-blue-900 dark:text-blue-300"
            onExport={() => exportToExcel(cardProposals, selectedCard.label)}
            onImport={() => openImport('card')}
            onClose={() => { setSelectedCard(null); setCardProposals([]) }}
          />
          <div className="overflow-x-auto">
            {cardLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
              </div>
            ) : (
              <ProposalTable proposals={cardProposals} emptyMessage="Nenhuma proposta neste status" />
            )}
          </div>
        </div>
      )}

      {/* Fila de análise */}
      <div className="card p-0 overflow-hidden">
        <TableHeader
          title="Fila de análise"
          count={proposals.length}
          icon="⚠"
          onExport={() => exportToExcel(proposals, 'fila_analise')}
          onImport={() => openImport('queue')}
        />
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800" />
            </div>
          ) : (
            <ProposalTable proposals={proposals} onAnalyze={openAnalysis} emptyMessage="Nenhuma proposta pendente de análise" />
          )}
        </div>
      </div>

      {/* Modal de importação */}
      <Modal open={importModalOpen} onClose={closeImport} title="Importar Excel" size="lg">
        <div className="space-y-4">
          {!importResult && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecione um arquivo <strong>.xlsx</strong> ou <strong>.csv</strong> com as colunas:
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded ml-1">
                  {EXPORT_HEADERS.join(' · ')}
                </span>
              </p>

              {/* Zona de drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-4xl mb-2">📤</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arraste o arquivo aqui ou <span className="text-red-600 font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx · .xls · .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              {importParsing && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-800" />
                  Lendo arquivo...
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  {importError}
                </div>
              )}

              {importPreview.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preview — {importPreview.length} linha(s) encontrada(s)
                  </div>
                  <div className="overflow-x-auto max-h-64 rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <tr>
                          {EXPORT_HEADERS.map(h => (
                            <th key={h} className="table-header text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            {EXPORT_HEADERS.map(h => (
                              <td key={h} className="table-cell whitespace-nowrap max-w-[160px] truncate">
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {importPreview.length > 50 && (
                          <tr>
                            <td colSpan={EXPORT_HEADERS.length} className="table-cell text-center text-gray-400 py-2">
                              ... e mais {importPreview.length - 50} linha(s)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {importResult && (
            <div className="space-y-3">
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Importação concluída</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{importResult.updated}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Atualizadas</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">{importResult.not_found}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">Não encontradas</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gray-500">{importResult.skipped}</div>
                  <div className="text-xs text-gray-500 mt-1">Ignoradas</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button onClick={closeImport} className="btn-secondary">
              {importResult ? 'Fechar' : 'Cancelar'}
            </button>
            {!importResult && (
              <button
                onClick={handleConfirmImport}
                disabled={importPreview.length === 0 || importSending || importParsing}
                className="btn-primary disabled:opacity-50"
              >
                {importSending ? 'Importando...' : `Importar ${importPreview.length > 0 ? `(${importPreview.length})` : ''}`}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de análise */}
      <Modal open={modal === 'analysis'} onClose={() => setModal(null)} title="Análise Antifraude" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Código:</span> <span className="font-medium">{selected.code}</span></div>
                <div><span className="text-gray-400">CPF:</span> <span className="font-mono">{selected.cpf}</span></div>
                <div><span className="text-gray-400">Cliente:</span> <span className="font-medium">{selected.client_name}</span></div>
                <div><span className="text-gray-400">Status AF:</span> {statusBadge(selected.antifraud_status || 'Nao Analisado')}</div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Decisão *</label>
              <select
                value={analysisForm.status}
                onChange={(e) => setAnalysisForm((f) => ({ ...f, status: e.target.value }))}
                className="input-field"
              >
                <option value="">Selecione a decisão...</option>
                {ANALYSIS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: '✅ Aprovar', value: 'Aprovada no Banco', active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20' },
                { label: '❌ Reprovar', value: 'Reprovar no Banco', active: 'bg-red-600 text-white border-red-600', inactive: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20' },
                { label: '⚠ Sinalizar', value: 'Suspeita de Antifraude', active: 'bg-amber-500 text-white border-amber-500', inactive: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20' },
                { label: '📅 Agendar', value: 'Agendar para acompanhamento', active: 'bg-purple-600 text-white border-purple-600', inactive: 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20' },
                { label: '❓ Não Mapeada', value: 'Nao Mapeada', active: 'bg-gray-600 text-white border-gray-600', inactive: 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800' },
              ].map(btn => (
                <button
                  key={btn.value}
                  onClick={() => quickAction(btn.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${analysisForm.status === btn.value ? btn.active : btn.inactive}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {analysisForm.status === 'Agendar para acompanhamento' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Acompanhamento</label>
                <input
                  type="datetime-local"
                  value={analysisForm.schedule_date}
                  onChange={(e) => setAnalysisForm((f) => ({ ...f, schedule_date: e.target.value }))}
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              <textarea
                value={analysisForm.notes}
                onChange={(e) => setAnalysisForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field h-24 resize-none"
                placeholder="Descreva os motivos da decisão..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleSaveAnalysis}
                disabled={saving || !analysisForm.status}
                className="btn-primary"
              >
                {saving ? 'Salvando...' : 'Confirmar Análise'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
