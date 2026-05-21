export type BackupType = 'auto' | 'manual'

export interface BackupEntry {
  id: number
  fileName: string
  filePath: string
  type: BackupType
  sizeBytes: number
  createdAt: string
  status: string
}

export interface BackupStatus {
  backupsDir: string
  autoEnabled: boolean
  retentionDays: number
  lastAutoBackup: BackupEntry | null
  totalCount: number
}
