import { app } from 'electron';
import { join } from 'path';
export function getDbPath() {
    return join(app.getPath('userData'), 'pos.db');
}
export function getBackupsDir() {
    return join(app.getPath('userData'), 'backups');
}
export function getImagesDir() {
    return join(app.getPath('userData'), 'images');
}
export function resolveImagePath(relativePath) {
    return join(app.getPath('userData'), relativePath);
}
export function getMigrationsDir() {
    if (app.isPackaged) {
        return join(process.resourcesPath, 'database', 'migrations');
    }
    return join(app.getAppPath(), 'database', 'migrations');
}
