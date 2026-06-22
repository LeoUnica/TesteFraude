import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

interface DashboardFilters {
  date_from?: string
  date_to?: string
}

export function useDashboard(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)
      return api.get(`/dashboard?${params}`).then((r) => r.data)
    },
    staleTime: 0,
  })
}
