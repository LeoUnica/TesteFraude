interface PaginationProps {
  page: number
  total: number
  limit: number
  onPage: (page: number) => void
}

export default function Pagination({ page, total, limit, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return start + i
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <div className="text-sm text-gray-500">
        Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total} registros
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Anterior</button>
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)} className={`px-3 py-1 text-sm border rounded-lg ${p === page ? 'bg-blue-700 text-white border-blue-700' : 'hover:bg-gray-50'}`}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima</button>
      </div>
    </div>
  )
}
