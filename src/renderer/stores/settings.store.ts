import { create } from 'zustand'
import type { AppSettingsFull } from '@shared/types/settings'
import type { ThemeMode } from '@shared/types/api'

interface SettingsState extends AppSettingsFull {
  hydrated: boolean
  hydrate: () => Promise<void>
  applyFromServer: (data: AppSettingsFull) => void
  save: (input: Partial<AppSettingsFull>) => Promise<{ ok: boolean; error?: string }>
}

function applyThemeClass(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  currencySymbol: 'S/',
  currencyDecimals: 2,
  soundsEnabled: true,
  companyName: '',
  companyAddress: '',
  companyLogoPath: null,
  printerTicket: '',
  printerLabels: '',
  printerPaperWidth: '58mm',
  labelPreset: '50x25',
  labelWidthMm: 50,
  labelHeightMm: 25,
  labelDpi: 203,
  ticketLogoWidthPercent: 65,
  ticketSlogan: '',
  hydrated: false,

  applyFromServer: (data) => {
    applyThemeClass(data.theme)
    set({ ...data, hydrated: true })
  },

  hydrate: async () => {
    const result = await window.api.settings.get()
    if (result.ok) get().applyFromServer(result.data)
    else set({ hydrated: true })
  },

  save: async (input) => {
    const result = await window.api.settings.update({
      theme: input.theme,
      currencySymbol: input.currencySymbol,
      soundsEnabled: input.soundsEnabled,
      companyName: input.companyName,
      companyAddress: input.companyAddress,
      printerTicket: input.printerTicket,
      printerLabels: input.printerLabels,
      printerPaperWidth: input.printerPaperWidth,
      labelPreset: input.labelPreset,
      labelWidthMm: input.labelWidthMm,
      labelHeightMm: input.labelHeightMm,
      labelDpi: input.labelDpi,
      ticketLogoWidthPercent: input.ticketLogoWidthPercent,
      ticketSlogan: input.ticketSlogan
    })
    if (!result.ok) return { ok: false, error: result.error }
    get().applyFromServer(result.data)
    return { ok: true }
  }
}))
