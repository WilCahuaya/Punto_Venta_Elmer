export function findUserByUsername(db, username) {
    return db
        .prepare(`SELECT id, username, password_hash, display_name, is_active
       FROM users WHERE username = ? AND is_active = 1`)
        .get(username);
}
export function findUserById(db, id) {
    return db
        .prepare(`SELECT id, username, password_hash, display_name, is_active
       FROM users WHERE id = ? AND is_active = 1`)
        .get(id);
}
