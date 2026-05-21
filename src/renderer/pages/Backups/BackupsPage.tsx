import { useCallback, useEffect, useState } from 'react'
import type { BackupEntry, BackupStatus } from '@shared/types/backup'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatDateTime } from '../../lib/datetime'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function BackupsPage(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retentionDays, setRetentionDays] = useState('30')
  const [autoEnabled, setAutoEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [listRes, statusRes] = await Promise.all([
      window.api.backup.list(),
      window.api.backup.status()
    ])
    if (listRes.ok) setBackups(listRes.data)
    else setError(listRes.error)
    if (statusRes.ok) {
      setStatus(statusRes.data)
      setRetentionDays(String(statusRes.data.retentionDays))
      setAutoEnabled(statusRes.data.autoEnabled)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(): Promise<void> {
    setWorking(true)
    setError(null)
    const result = await window.api.backup.create()
    setWorking(false)
    if (!result.ok) setError(result.error)
    else {
      setMessage(`Backup creado: ${result.data.fileName}`)
      void load()
    }
  }

  async function handleRestore(entry: BackupEntry): Promise<void> {
    const ok = confirm(
      `¿Restaurar el backup "${entry.fileName}"?\n\n` +
        'Se reemplazará la base de datos actual. La aplicación se reiniciará.\n' +
        'Se perderán los cambios posteriores a este backup.'
    )
    if (!ok) return
    setWorking(true)
    const result = await window.api.backup.restore(entry.id)
    setWorking(false)
    if (!result.ok) setError(result.error)
  }

  async function handleExport(entry: BackupEntry): Promise<void> {
    setWorking(true)
    const result = await window.api.backup.export(entry.id)
    setWorking(false)
    if (!result.ok) setError(result.error)
    else setMessage(`Exportado a: ${result.data}`)
  }

  async function handleImport(): Promise<void> {
    setWorking(true)
    const result = await window.api.backup.import()
    setWorking(false)
    if (!result.ok) setError(result.error)
    else {
      setMessage(`Backup importado: ${result.data.fileName}`)
      void load()
    }
  }

  async function handleDelete(entry: BackupEntry): Promise<void> {
    if (!confirm(`¿Eliminar backup "${entry.fileName}"?`)) return
    const result = await window.api.backup.delete(entry.id)
    if (!result.ok) setError(result.error)
    else {
      setMessage('Backup eliminado')
      void load()
    }
  }

  async function saveBackupSettings(): Promise<void> {
    await window.api.settings.set('backup_auto_enabled', autoEnabled ? 'true' : 'false')
    await window.api.settings.set('backup_retention_days', retentionDays)
    setMessage('Configuración de backups guardada')
    void load()
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Backups</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Copias de seguridad de la base de datos SQLite
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void handleImport()} disabled={working}>
            Importar archivo .db
          </Button>
          <Button onClick={() => void handleCreate()} disabled={working}>
            {working ? 'Procesando...' : 'Crear backup ahora'}
          </Button>
        </div>
      </header>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {status && (
        <section className="mb-6 grid gap-4 rounded-xl border border-surface-border bg-surface-elevated p-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">Estado</h3>
            <ul className="space-y-1 text-sm text-[rgb(var(--text-muted))]">
              <li>
                Carpeta: <code className="text-xs">{status.backupsDir}</code>
              </li>
              <li>Total backups: {status.totalCount}</li>
              <li>
                Último automático:{' '}
                {status.lastAutoBackup
                  ? formatDateTime(status.lastAutoBackup.createdAt)
                  : 'Ninguno hoy'}
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium">Configuración automática</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
              />
              Backup automático diario al iniciar la app
            </label>
            <Input
              label="Retener backups automáticos (días)"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
            />
            <Button variant="secondary" type="button" onClick={() => void saveBackupSettings()}>
              Guardar configuración
            </Button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-surface-border">
        <div className="border-b border-surface-border bg-surface-elevated px-4 py-3">
          <h3 className="font-medium">Historial de backups</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface/50">
              <tr>
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Tamaño</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                    Cargando...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                    Sin backups. Cree uno manual o espere el automático diario.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-surface-border/50 hover:bg-surface-elevated/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{b.fileName}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                      {formatDateTime(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={b.type === 'auto' ? 'muted' : 'default'}>
                        {b.type === 'auto' ? 'Automático' : 'Manual'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatSize(b.sizeBytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => void handleExport(b)}
                          disabled={working}
                        >
                          Exportar
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => void handleRestore(b)}
                          disabled={working}
                        >
                          Restaurar
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => void handleDelete(b)}
                          disabled={working}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-[rgb(var(--text-muted))]">
        La restauración reinicia la aplicación. Exporte backups periódicamente a un disco externo
        o la nube para mayor seguridad.
      </p>
    </div>
  )
}
