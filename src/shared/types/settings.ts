import type { ThemeMode } from './api'

import type { LabelDpi } from '@shared/lib/thermal-print'

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
  /** Ancho de rollo térmico para tickets: 58mm o 80mm. */
  printerPaperWidth: '58mm' | '80mm'
  /** Preset de etiqueta autoadhesiva (50x25, custom, etc.). */
  labelPreset: string
  /** Ancho/alto etiqueta en mm (si preset = custom). */
  labelWidthMm: number
  labelHeightMm: number
  /** DPI impresora de etiquetas (203 estándar, 300 alta resolución). */
  labelDpi: LabelDpi
  /** Ancho del logo en ticket (% del ancho útil del rollo, 40–100). */
  ticketLogoWidthPercent: number
  /** Texto final del ticket (slogan, verso bíblico, etc.). */
  ticketSlogan: string
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
  labelPreset?: string
  labelWidthMm?: number
  labelHeightMm?: number
  labelDpi?: LabelDpi
  ticketLogoWidthPercent?: number
  ticketSlogan?: string
}
