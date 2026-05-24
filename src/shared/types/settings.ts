import type { ThemeMode } from './api'

export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
  status: number
}

export interface AppSettingsFull {
  theme: ThemeMode
  currencySymbol: string
  currencyDecimals: 2
  soundsEnabled: boolean
  companyName: string
  companyAddress: string
  companyLogoPath: string | null
  printerTicket: string
  printerLabels: string
  /** Ancho de rollo térmico: 58mm o 80mm. */
  printerPaperWidth: '58mm' | '80mm'
  /** Ancho del logo en ticket (% del ancho útil del rollo, 40–100). */
  ticketLogoWidthPercent: number
}

export interface SettingsUpdateInput {
  theme?: ThemeMode
  currencySymbol?: string
  soundsEnabled?: boolean
  companyName?: string
  companyAddress?: string
  printerTicket?: string
  printerLabels?: string
  printerPaperWidth?: '58mm' | '80mm'
  ticketLogoWidthPercent?: number
}
