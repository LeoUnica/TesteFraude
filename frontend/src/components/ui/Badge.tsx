type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'gray' | 'purple'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
}

export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    'ativo': { label: 'Ativo', variant: 'success' },
    'inativo': { label: 'Inativo', variant: 'danger' },
    'bloqueado': { label: 'Bloqueado', variant: 'danger' },
    'Pendente': { label: 'Pendente', variant: 'warning' },
    'Aprovada': { label: 'Aprovada', variant: 'success' },
    'Reprovada': { label: 'Reprovada', variant: 'danger' },
    'Averbada': { label: 'Averbada', variant: 'purple' },
    'Em Analise': { label: 'Em Análise', variant: 'info' },
    'Suspeita de Antifraude': { label: 'Suspeita', variant: 'warning' },
    'Suspeita': { label: 'Suspeita', variant: 'warning' },
    'Aprovado': { label: 'Aprovado', variant: 'success' },
    'Reprovado': { label: 'Reprovado', variant: 'danger' },
    'Nao Analisado': { label: 'Não Analisado', variant: 'gray' },
    'Nao Mapeada': { label: 'Não Mapeada', variant: 'gray' },
    'Agendada': { label: 'Agendada', variant: 'purple' },
    'ativo_rule': { label: 'Ativa', variant: 'success' },
    'inativo_rule': { label: 'Inativa', variant: 'gray' },
  }
  const config = map[status] || { label: status, variant: 'gray' as BadgeVariant }
  return <Badge label={config.label} variant={config.variant} />
}
