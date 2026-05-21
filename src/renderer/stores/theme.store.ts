import { create } from 'zustand'
import type { AppSettings, ThemeMode } from '@shared/types/api'

interface ThemeState {
  theme: ThemeMode
  currencySymbol: string
  hydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: ThemeMode) => Promise<void>
  toggleTheme: () => Promise<void>
}

function applyThemeClass(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  currencySymbol: 'S/',
  hydrated: false,

  hydrate: async () => {
    const result = await window.api.settings.get()
    if (result.ok) {
      applyThemeClass(result.data.theme)
      set({
        theme: result.data.theme,
        currencySymbol: result.data.currencySymbol,
        hydrated: true
      })
    } else {
      set({ hydrated: true })
    }
  },

  setTheme: async (theme) => {
    const result = await window.api.settings.set('theme', theme)
    if (result.ok) {
      applyThemeClass(theme)
      set({ theme: result.data.theme, currencySymbol: result.data.currencySymbol })
    }
  },

  toggleTheme: async () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    await get().setTheme(next)
  }
}))

export function useAppSettings(): AppSettings {
  const theme = useThemeStore((s) => s.theme)
  const currencySymbol = useThemeStore((s) => s.currencySymbol)
  return {
    theme,
    currencySymbol,
    currencyDecimals: 2,
    soundsEnabled: true,
    companyName: 'Mi Negocio'
  }
}
