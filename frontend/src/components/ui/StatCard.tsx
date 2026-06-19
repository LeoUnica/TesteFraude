interface StatCardProps {
  title: string
  value: number | string
  icon: string
  color: string
  subtitle?: string
}

export default function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</div>}
      </div>
    </div>
  )
}
