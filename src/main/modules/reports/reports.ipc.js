import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { exportReportExcelService, exportReportPdfService, getReportSummaryService } from './reports.service';
export function registerReportsIpc() {
    ipcMain.handle(IPC_CHANNELS.REPORTS_SUMMARY, (_e, range) => getReportSummaryService(range));
    ipcMain.handle(IPC_CHANNELS.REPORTS_EXPORT_PDF, (_e, range) => exportReportPdfService(range));
    ipcMain.handle(IPC_CHANNELS.REPORTS_EXPORT_EXCEL, (_e, range) => exportReportExcelService(range));
}
