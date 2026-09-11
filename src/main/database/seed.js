import { ensureSystemServiceProduct } from '../modules/products/system-product';
import { hashPassword } from '../utils/crypto';
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'admin123';
export function seedDatabase(database) {
    const userCount = database.prepare('SELECT COUNT(*) as c FROM users').get();
    if (userCount.c === 0) {
        database
            .prepare(`INSERT INTO users (username, password_hash, display_name)
         VALUES (?, ?, ?)`)
            .run(DEFAULT_USER, hashPassword(DEFAULT_PASS), 'Administrador');
    }
    const defaults = {
        theme: 'light',
        currency_symbol: 'S/',
        currency_decimals: '2',
        sounds_enabled: 'true',
        company_name: '',
        company_address: '',
        printer_ticket: '',
        printer_labels: '',
        printer_paper_width: '58mm',
        label_preset: '50x25',
        label_width_mm: '50',
        label_height_mm: '25',
        label_dpi: '203',
        ticket_logo_width_percent: '65',
        ticket_slogan: '',
        backup_auto_enabled: 'true',
        backup_retention_days: '30'
    };
    const upsert = database.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO NOTHING`);
    for (const [key, value] of Object.entries(defaults)) {
        upsert.run(key, value);
    }
    database
        .prepare(`INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
        .run('001_init');
    ensureSystemServiceProduct(database);
}
export function getDefaultCredentials() {
    return { username: DEFAULT_USER, password: DEFAULT_PASS };
}
