import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type Database from 'better-sqlite3'
import { getMigrationsDir } from '../utils/paths'

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = new Set(
    database
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => (row as { version: string }).version)
  )

  const dir = getMigrationsDir()
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const apply = database.transaction((version: string, sql: string) => {
    database.exec(sql)
    database.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
  })

  for (const file of files) {
    const version = file.replace('.sql', '')
    if (applied.has(version)) continue
    const sql = readFileSync(join(dir, file), 'utf-8')
    apply(version, sql)
  }
}
