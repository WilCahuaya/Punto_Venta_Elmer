import { getDatabase } from '../../database/connection';
import { verifyPassword } from '../../utils/crypto';
import { findUserByUsername } from './auth.repository';
let currentSession = null;
export function login(payload) {
    const { username, password } = payload;
    if (!username.trim() || !password) {
        return { ok: false, error: 'Usuario y contraseña son obligatorios' };
    }
    const db = getDatabase();
    const user = findUserByUsername(db, username.trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
        return { ok: false, error: 'Credenciales incorrectas' };
    }
    currentSession = {
        id: user.id,
        username: user.username,
        displayName: user.display_name
    };
    return { ok: true, data: currentSession };
}
export function logout() {
    currentSession = null;
    return { ok: true, data: null };
}
export function getSession() {
    return { ok: true, data: currentSession };
}
export function getCurrentUserId() {
    return currentSession?.id ?? null;
}
