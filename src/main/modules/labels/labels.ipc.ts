import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { LabelPrintPayload } from '@shared/types/labels'
import {
  checkBarcodeService,
  previewLabelsPdfService,
  printLabelsService
} from './labels.service'

export function registerLabelsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.LABELS_CHECK_BARCODE, (_e, barcode: string) =>
    checkBarcodeService(barcode)
  )
  ipcMain.handle(IPC_CHANNELS.LABELS_PRINT, (_e, payload: LabelPrintPayload) =>
    printLabelsService(payload)
  )
  ipcMain.handle(IPC_CHANNELS.LABELS_PREVIEW_PDF, (_e, payload: LabelPrintPayload) =>
    previewLabelsPdfService(payload)
  )
}
