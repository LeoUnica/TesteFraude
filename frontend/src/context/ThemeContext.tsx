import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  dark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ dark: false, toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme: () => setDark(v => !v) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
