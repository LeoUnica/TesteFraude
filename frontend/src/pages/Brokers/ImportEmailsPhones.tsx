import { useRef, useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react'

interface Row { linha: number; tipo: string; valor: string; corretor: string; valido: boolean; erro?: string }

const TEMPLATE_CSV = `corretor_codigo,tipo,valor
COR001,email,joao@exemplo.com
COR001,telefone,(11) 99999-9999
COR002,email,maria@exemplo.com
COR002,telefone,(21) 98888-8888`

export default function ImportEmailsPhones() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle')
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState({ total: 0, validos: 0, invalidos: 0, importados: 0 })
  const [importing, setImporting] = useState(false)
  const [erros, setErros] = useState<string[]>([])

  const parseCSV = (text: string): Row[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const header = lines[0].toLowerCase().split(',').map(h => h.trim())
    const codIdx = header.findIndex(h => h.includes('codigo') || h.includes('corretor'))
    const tipoIdx = header.findIndex(h => h === 'tipo')
    const valorIdx = header.findIndex(h => h === 'valor' || h === 'contato')

    return lines.slice(1).map((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const tipo = tipoIdx >= 0 ? cols[tipoIdx]?.toLowerCase() : ''
      const valor = valorIdx >= 0 ? cols[valorIdx] : ''
      const corretor = codIdx >= 0 ? cols[codIdx] : ''
      let valido = true
      let erro = ''
      if (!corretor) { valido = false; erro = 'Código do corretor ausente' }
      else if (!tipo || !['email', 'telefone', 'e-mail', 'phone'].includes(tipo)) { valido = false; erro = `Tipo inválido: "${tipo}"` }
      else if (!valor) { valido = false; erro = 'Valor ausente' }
      else if ((tipo === 'email' || tipo === 'e-mail') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) { valido = false; erro = 'E-mail inválido' }
      return { linha: i + 2, tipo: tipo || '—', valor, corretor, valido, erro }
    })
  }

  const handleFile = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setResult({ total: parsed.length, validos: parsed.filter(r => r.valido).length, invalidos: parsed.filter(r => !r.valido).length, importados: 0 })
      setStep('preview')
    }
    reader.readAsText(f, 'UTF-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) handleFile(f)
  }

  const handleImport = async () => {
    setImporting(true)
    await new Promise(r => setTimeout(r, 1200))
    const importados = rows.filter(r => r.valido).length
    setResult(prev => ({ ...prev, importados }))
    setErros(rows.filter(r => !r.valido).map(r => `Linha ${r.linha}: ${r.erro}`))
    setStep('done')
    setImporting(false)
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'template_emails_telefones.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => { setFile(null); setRows([]); setStep('idle'); setErros([]) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importação — E-mails e Telefones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Importe e-mails e telefones de corretores via CSV</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={15} /> Baixar Template CSV
        </button>
      </div>

      {/* Cards de resultado */}
      {step !== 'idle' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total de Linhas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{result.validos}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Válidos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{result.invalidos}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inválidos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{result.importados}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Importados</div>
          </div>
        </div>
      )}

      {/* Upload */}
      {step === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`card flex flex-col items-center justify-center py-16 cursor-pointer border-2 border-dashed transition-colors ${dragging ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
        >
          <Upload size={40} className="text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">Arraste o arquivo aqui ou clique para selecionar</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Formatos suportados: CSV, XLSX</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Colunas esperadas: <span className="font-mono">corretor_codigo, tipo, valor</span></p>
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file?.name}</span>
              <span className="text-xs text-gray-400">— {rows.length} registros</span>
            </div>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Trocar arquivo</button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                  <th className="table-header text-center w-16">Linha</th>
                  <th className="table-header text-left">Corretor</th>
                  <th className="table-header text-left">Tipo</th>
                  <th className="table-header text-left">Valor</th>
                  <th className="table-header text-center w-24">Status</th>
                  <th className="table-header text-left">Observação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.linha} className={`border-b border-gray-100 dark:border-gray-700/50 ${!r.valido ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="table-cell text-center text-gray-400 text-xs">{r.linha}</td>
                    <td className="table-cell font-mono text-xs">{r.corretor || '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.tipo === 'email' || r.tipo === 'e-mail' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="table-cell text-gray-700 dark:text-gray-300">{r.valor || '—'}</td>
                    <td className="table-cell text-center">
                      {r.valido
                        ? <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                        : <XCircle size={16} className="text-red-500 mx-auto" />}
                    </td>
                    <td className="table-cell text-xs text-red-600 dark:text-red-400">{r.erro || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={handleImport} disabled={importing || result.validos === 0} className="btn-primary">
              {importing ? 'Importando...' : `Importar ${result.validos} registro(s) válido(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Resultado final */}
      {step === 'done' && (
        <div className="space-y-4">
          <div className="card p-6 flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-emerald-500 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Importação Concluída</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-semibold text-emerald-600">{result.importados}</span> registros importados com sucesso.
              {result.invalidos > 0 && <> <span className="font-semibold text-red-600">{result.invalidos}</span> registros inválidos foram ignorados.</>}
            </p>
            <button onClick={reset} className="btn-primary mt-4">Nova Importação</button>
          </div>

          {erros.length > 0 && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle size={16} /> Registros com erro ({erros.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {erros.map((e, i) => (
                  <div key={i} className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded">{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
