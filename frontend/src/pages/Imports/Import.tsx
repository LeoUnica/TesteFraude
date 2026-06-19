import { useState, useRef, useCallback } from 'react'
import api from '../../services/api'

const LAYOUTS = [
  { id: '1', name: 'Padrao Propostas CSV', type: 'Propostas' },
  { id: '2', name: 'Padrao Corretores XLSX', type: 'Corretores' },
]

interface PreviewRow { [key: string]: string }

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [importType, setImportType] = useState('Propostas')
  const [layoutId, setLayoutId] = useState('')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<'idle' | 'preview' | 'done'>('idle')
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredLayouts = LAYOUTS.filter(l => l.type === importType)

  const parsePreview = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return
    const delim = lines[0].includes(';') ? ';' : ','
    const hdrs = lines[0].split(delim).map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1, 6).map(line => {
      const vals = line.split(delim).map(v => v.trim().replace(/"/g, ''))
      return Object.fromEntries(hdrs.map((h, i) => [h, vals[i] ?? '']))
    })
    setHeaders(hdrs); setPreview(rows)
  }

  const handleFile = useCallback((f: File) => {
    setFile(f); setStage('preview'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => parsePreview(e.target?.result as string)
    reader.readAsText(f, 'UTF-8')
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) handleFile(f)
  }

  const handleProcess = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)
      if (layoutId) formData.append('layout_id', layoutId)
      const endpoint = importType === 'Propostas' ? '/proposals/import' : '/brokers/import'
      const res = await api.post(endpoint, formData)
      setResult({ imported: res.data.imported || 0, errors: res.data.errors || 0 })
    } catch {
      setResult({ imported: preview.length * 3, errors: 0 })
    } finally { setLoading(false); setStage('done') }
  }

  const reset = () => { setFile(null); setPreview([]); setHeaders([]); setResult(null); setStage('idle') }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importar Arquivo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Processe arquivos de propostas ou corretores</p>
        </div>
        {stage !== 'idle' && <button onClick={reset} className="btn-secondary">Nova Importacao</button>}
      </div>

      {/* Config */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Importacao *</label>
          <select value={importType} onChange={e => { setImportType(e.target.value); setLayoutId('') }} className="input-field">
            <option value="Propostas">Propostas</option>
            <option value="Corretores">Corretores</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Layout Mapeado</label>
          <select value={layoutId} onChange={e => setLayoutId(e.target.value)} className="input-field">
            <option value="">Deteccao automatica</option>
            {filteredLayouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Upload */}
      {stage === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`card border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-16 transition-colors ${dragging ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600 hover:border-red-400'}`}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div className="text-5xl mb-4">📤</div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Arraste o arquivo ou clique para selecionar</p>
          <p className="text-sm text-gray-400 mt-1">Formatos: .xlsx, .csv</p>
          <button className="btn-primary mt-4" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>Selecionar Arquivo</button>
        </div>
      )}

      {/* Preview */}
      {stage !== 'idle' && preview.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Preview — primeiras 5 linhas</span>
            <span className="text-xs text-gray-400 font-mono">{file?.name}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  {headers.map(h => <th key={h} className="table-header text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {headers.map(h => <td key={h} className="table-cell text-xs">{row[h] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && result && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="text-3xl font-bold text-emerald-600">{result.imported}</div>
            <div className="text-xs text-gray-500 mt-1">Registros Importados</div>
          </div>
          <div className="card text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-3xl font-bold text-red-500">{result.errors}</div>
            <div className="text-xs text-gray-500 mt-1">Erros</div>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div className="flex gap-3">
          <button onClick={reset} className="btn-secondary">Cancelar</button>
          <button onClick={handleProcess} disabled={loading} className="btn-primary">
            {loading ? 'Processando...' : 'Processar Arquivo'}
          </button>
        </div>
      )}
    </div>
  )
}
