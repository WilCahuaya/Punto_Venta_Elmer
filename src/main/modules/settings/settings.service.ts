import { BrowserWindow } from 'electron'
import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { extname, join } from 'path'
import type { ApiResult } from '@shared/types/api'
import type {
  AppSettingsFull,
  PrinterInfo,
  SettingsUpdateInput
} from '@shared/types/settings'
import { CURRENCY_DECIMALS } from '@shared/lib/currency'
import { parseLabelDpi } from '@shared/lib/thermal-print'
import { getDatabase } from '../../database/connection'
import { ensureImagesDir, getImageMediaUrl, pickImageFile } from '../../services/image.service'
import { getLabelDimensionsFromSettings } from '../../services/label-settings'
import { printTestLabel } from '../../services/label-print.service'
import { mapPrinterList } from '../../services/printer-resolve.service'
import { resolveImagePath } from '../../utils/paths'
import { parseTicketLogoWidthPercent } from '../../services/ticket-logo'
import { printTestTicket } from '../../services/printer.service'

const ALLOWED_KEYS = new Set([
  'theme',
  'currency_symbol',
  'sounds_enabled',
  'company_name',
  'company_address',
  'company_logo_path',
  'printer_ticket',
  'printer_labels',
  'printer_paper_width',
  'label_preset',
  'label_width_mm',
  'label_height_mm',
  'label_dpi',
  'ticket_logo_width_percent',
  'backup_auto_enabled',
  'backup_retention_days'
])

function getSettingsMap(db: ReturnType<typeof getDatabase>): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

function mapSettings(map: Record<string, string>): AppSettingsFull {
  return {
    theme: map.theme === 'dark' ? 'dark' : 'light',
    currencySymbol: map.currency_symbol ?? 'S/',
    currencyDecimals: CURRENCY_DECIMALS,
    soundsEnabled: map.sounds_enabled !== 'false',
    companyName: map.company_name ?? '',
    companyAddress: map.company_address ?? '',
    companyLogoPath: map.company_logo_path || null,
    printerTicket: map.printer_ticket ?? '',
    printerLabels: map.printer_labels ?? '',
    printerPaperWidth: map.printer_paper_width === '80mm' ? '80mm' : '58mm',
    labelPreset: map.label_preset ?? '50x25',
    labelWidthMm: Number(map.label_width_mm ?? 50) || 50,
    labelHeightMm: Number(map.label_height_mm ?? 25) || 25,
    labelDpi: parseLabelDpi(map.label_dpi),
    ticketLogoWidthPercent: parseTicketLogoWidthPercent(map.ticket_logo_width_percent)
  }
}

function upsertSetting(db: ReturnType<typeof getDatabase>, key: string, value: string): void {
  if (!ALLOWED_KEYS.has(key)) return
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value)
}

export function getSettings(): ApiResult<AppSettingsFull> {
  const db = getDatabase()
  return { ok: true, data: mapSettings(getSettingsMap(db)) }
}

export function updateSettings(input: SettingsUpdateInput): ApiResult<AppSettingsFull> {
  const db = getDatabase()

  if (input.theme && input.theme !== 'light' && input.theme !== 'dark') {
    return { ok: false, error: 'Tema inválido' }
  }

  if (input.currencySymbol !== undefined && !input.currencySymbol.trim()) {
    return { ok: false, error: 'El símbolo de moneda es obligatorio' }
  }

  if (input.companyName !== undefined && !input.companyName.trim()) {
    return { ok: false, error: 'El nombre de empresa es obligatorio' }
  }

  if (input.theme !== undefined) upsertSetting(db, 'theme', input.theme)
  if (input.currencySymbol !== undefined) upsertSetting(db, 'currency_symbol', input.currencySymbol.trim())
  if (input.soundsEnabled !== undefined) {
    upsertSetting(db, 'sounds_enabled', input.soundsEnabled ? 'true' : 'false')
  }
  if (input.companyName !== undefined) upsertSetting(db, 'company_name', input.companyName.trim())
  if (input.companyAddress !== undefined) upsertSetting(db, 'company_address', input.companyAddress.trim())
  if (input.printerTicket !== undefined) upsertSetting(db, 'printer_ticket', input.printerTicket)
  if (input.printerLabels !== undefined) upsertSetting(db, 'printer_labels', input.printerLabels)
  if (input.printerPaperWidth !== undefined) {
    upsertSetting(
      db,
      'printer_paper_width',
      input.printerPaperWidth === '80mm' ? '80mm' : '58mm'
    )
  }
  if (input.labelPreset !== undefined) {
    upsertSetting(db, 'label_preset', input.labelPreset.trim() || '50x25')
  }
  if (input.labelWidthMm !== undefined) {
    upsertSetting(db, 'label_width_mm', String(Math.max(20, Math.min(120, input.labelWidthMm))))
  }
  if (input.labelHeightMm !== undefined) {
    upsertSetting(db, 'label_height_mm', String(Math.max(10, Math.min(80, input.labelHeightMm))))
  }
  if (input.labelDpi !== undefined) {
    upsertSetting(db, 'label_dpi', String(parseLabelDpi(String(input.labelDpi))))
  }
  if (input.ticketLogoWidthPercent !== undefined) {
    upsertSetting(
      db,
      'ticket_logo_width_percent',
      String(parseTicketLogoWidthPercent(String(input.ticketLogoWidthPercent)))
    )
  }

  return getSettings()
}

export function setSetting(key: string, value: string): ApiResult<AppSettingsFull> {
  if (!ALLOWED_KEYS.has(key)) {
    return { ok: false, error: 'Configuración no permitida' }
  }
  const db = getDatabase()
  upsertSetting(db, key, value)
  return getSettings()
}

export async function listPrintersService(): Promise<ApiResult<PrinterInfo[]>> {
  try {
    let win = BrowserWindow.getAllWindows()[0]
    let temp: BrowserWindow | null = null

    if (!win) {
      temp = new BrowserWindow({ show: false, width: 400, height: 300 })
      win = temp
    }

    const printers = await win.webContents.getPrintersAsync()
    if (temp) temp.destroy()

    const mapped = mapPrinterList(printers)
    return { ok: true, data: mapped }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'No se pudieron detectar impresoras'
    }
  }
}

const LOGO_RELATIVE = 'images/company-logo'

export async function pickCompanyLogoService(): Promise<ApiResult<AppSettingsFull>> {
  const source = await pickImageFile()
  if (!source) return getSettings()

  const ext = extname(source).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return { ok: false, error: 'Formato de imagen no permitido' }
  }

  ensureImagesDir()
  const relative = `${LOGO_RELATIVE}${ext}`.replace(/\\/g, '/')
  const dest = resolveImagePath(relative)

  const db = getDatabase()
  const map = getSettingsMap(db)
  const oldPath = map.company_logo_path
  if (oldPath && oldPath !== relative) {
    const oldFull = resolveImagePath(oldPath)
    if (existsSync(oldFull)) unlinkSync(oldFull)
  }

  copyFileSync(source, dest)
  upsertSetting(db, 'company_logo_path', relative)

  return getSettings()
}

export function removeCompanyLogoService(): ApiResult<AppSettingsFull> {
  const db = getDatabase()
  const map = getSettingsMap(db)
  if (map.company_logo_path) {
    const full = resolveImagePath(map.company_logo_path)
    if (existsSync(full)) unlinkSync(full)
    upsertSetting(db, 'company_logo_path', '')
  }
  return getSettings()
}

export function getLogoUrlService(relativePath: string | null): ApiResult<string | null> {
  return { ok: true, data: getImageMediaUrl(relativePath) }
}

export async function testPrintLabelService(): Promise<ApiResult<null>> {
  const db = getDatabase()
  const map = getSettingsMap(db)
  const companyName = map.company_name?.trim() || 'Punto de Venta'
  const printerLabels = map.printer_labels ?? ''
  const printerTicket = map.printer_ticket ?? ''
  const dims = getLabelDimensionsFromSettings()

  try {
    await printTestLabel(companyName, printerLabels, dims, printerTicket)
    return { ok: true, data: null }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error al imprimir etiqueta de prueba'
    }
  }
}

export async function testPrintTicketService(): Promise<ApiResult<{ method?: string }>> {
  const result = await printTestTicket()
  if (!result.ok) return { ok: false, error: result.error ?? 'Error de impresión' }
  return { ok: true, data: { method: result.method } }
}
