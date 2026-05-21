import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { LabelPrintPayload } from '@shared/types/labels'
import {
  checkBarcodeService,
  generateBarcodeService,
  printLabelsService
} from './labels.service'

export function registerLabelsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.LABELS_GENERATE_BARCODE, () => generateBarcodeService())
  ipcMain.handle(IPC_CHANNELS.LABELS_CHECK_BARCODE, (_e, barcode: string) =>
    checkBarcodeService(barcode)
  )
  ipcMain.handle(IPC_CHANNELS.LABELS_PRINT, (_e, payload: LabelPrintPayload) =>
    printLabelsService(payload)
  )
}
