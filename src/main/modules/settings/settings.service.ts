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
import { getDatabase } from '../../database/connection'
import { ensureImagesDir, getImageMediaUrl, pickImageFile } from '../../services/image.service'
import { resolveImagePath } from '../../utils/paths'
import { printTestTicket } from '../../services/printer.service'

const ALLOWED_KEYS = new Set([
  'theme',
  'currency_symbol',
  'sounds_enabled',
  'company_name',
  'company_address',
  'company_logo_path',
  'printer_ticket',
  'printer_labels'
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
    companyName: map.company_name ?? 'Mi Negocio',
    companyAddress: map.company_address ?? '',
    companyLogoPath: map.company_logo_path || null,
    printerTicket: map.printer_ticket ?? '',
    printerLabels: map.printer_labels ?? ''
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

    const mapped: PrinterInfo[] = printers.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status
    }))

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

export async function testPrintTicketService(): Promise<ApiResult<null>> {
  const result = await printTestTicket()
  if (!result.ok) return { ok: false, error: result.error ?? 'Error de impresión' }
  return { ok: true, data: null }
}
