import type Database from 'better-sqlite3'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  display_name: string | null
  is_active: number
}

export function findUserByUsername(db: Database.Database, username: string): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, username, password_hash, display_name, is_active
       FROM users WHERE username = ? AND is_active = 1`
    )
    .get(username) as UserRow | undefined
}

export function findUserById(db: Database.Database, id: number): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, username, password_hash, display_name, is_active
       FROM users WHERE id = ? AND is_active = 1`
    )
    .get(id) as UserRow | undefined
}
