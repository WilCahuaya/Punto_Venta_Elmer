import { getDatabase } from '../database/connection'
import {
  parseLabelDpi,
  resolveLabelDimensions,
  type LabelDimensions
} from '@shared/lib/thermal-print'

function readSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

export function getLabelDimensionsFromSettings(): LabelDimensions {
  return resolveLabelDimensions({
    presetId: readSetting('label_preset', '50x25'),
    widthMm: Number(readSetting('label_width_mm', '50')),
    heightMm: Number(readSetting('label_height_mm', '25')),
    dpi: parseLabelDpi(readSetting('label_dpi', '203'))
  })
}
