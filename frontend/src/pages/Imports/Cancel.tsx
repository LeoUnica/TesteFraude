import { XCircle } from 'lucide-react'

export default function CancelImportPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <XCircle size={24} className="text-red-700 dark:text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cancelar Importação</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cancelamento de importações de propostas</p>
        </div>
      </div>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <XCircle size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  )
}
