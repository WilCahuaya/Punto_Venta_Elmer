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
}

export interface SettingsUpdateInput {
  theme?: ThemeMode
  currencySymbol?: string
  soundsEnabled?: boolean
  companyName?: string
  companyAddress?: string
  printerTicket?: string
  printerLabels?: string
}
