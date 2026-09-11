import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { LabelPrintPayload } from '@shared/types/labels'
import {
  checkBarcodeService,
  clearLabelPrintHistoryService,
  deleteLabelPrintHistoryJobService,
  getLabelPrintHistoryJobService,
  listLabelPrintHistoryService,
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
  ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_LIST, () => listLabelPrintHistoryService())
  ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_GET, (_e, id: number) =>
    getLabelPrintHistoryJobService(id)
  )
  ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_DELETE, (_e, id: number) =>
    deleteLabelPrintHistoryJobService(id)
  )
  ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_CLEAR, () => clearLabelPrintHistoryService())
}
