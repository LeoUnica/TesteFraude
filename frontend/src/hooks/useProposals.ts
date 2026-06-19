import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function useProposals(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['proposals', params],
    queryFn: () => api.get('/proposals', { params }).then((r) => r.data),
  })
}

export function useProposal(id: string | number) {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: () => api.get(`/proposals/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) =>
      api.patch(`/proposals/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}
