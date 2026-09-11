import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { checkBarcodeService, clearLabelPrintHistoryService, deleteLabelPrintHistoryJobService, getLabelPrintHistoryJobService, listLabelPrintHistoryService, previewLabelsPdfService, printLabelsService } from './labels.service';
export function registerLabelsIpc() {
    ipcMain.handle(IPC_CHANNELS.LABELS_CHECK_BARCODE, (_e, barcode) => checkBarcodeService(barcode));
    ipcMain.handle(IPC_CHANNELS.LABELS_PRINT, (_e, payload) => printLabelsService(payload));
    ipcMain.handle(IPC_CHANNELS.LABELS_PREVIEW_PDF, (_e, payload) => previewLabelsPdfService(payload));
    ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_LIST, () => listLabelPrintHistoryService());
    ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_GET, (_e, id) => getLabelPrintHistoryJobService(id));
    ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_DELETE, (_e, id) => deleteLabelPrintHistoryJobService(id));
    ipcMain.handle(IPC_CHANNELS.LABELS_HISTORY_CLEAR, () => clearLabelPrintHistoryService());
}
