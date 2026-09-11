import { getDatabase } from '../database/connection';
import { parseLabelDpi, resolveLabelDimensions } from '@shared/lib/thermal-print';
function readSetting(key, fallback = '') {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? fallback;
}
export function getLabelDimensionsFromSettings() {
    return resolveLabelDimensions({
        presetId: readSetting('label_preset', '50x25'),
        widthMm: Number(readSetting('label_width_mm', '50')),
        heightMm: Number(readSetting('label_height_mm', '25')),
        dpi: parseLabelDpi(readSetting('label_dpi', '203'))
    });
}
