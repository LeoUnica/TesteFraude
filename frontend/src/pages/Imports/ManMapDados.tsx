import { Database } from 'lucide-react'

export default function ManMapDadosPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Database size={24} className="text-red-700 dark:text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manutenção de Mapeamento de Dados</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manutenção dos mapeamentos de dados de importação</p>
        </div>
      </div>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <Database size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  )
}
