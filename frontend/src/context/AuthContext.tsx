// Re-export from Zustand store for backwards compatibility.
// Components can continue to call useAuth() and get the same API.
export { useAuthStore as useAuth } from '../store/authStore'

// Legacy AuthProvider no-op wrapper — kept so any import of AuthProvider
// in old code compiles without changes (renders children directly).
import React from 'react'
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
