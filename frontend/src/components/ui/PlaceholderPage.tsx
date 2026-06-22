import { Clock } from 'lucide-react'

export default function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <Clock size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  )
}
