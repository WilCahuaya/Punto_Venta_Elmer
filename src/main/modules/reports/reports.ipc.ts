import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { ReportDateRange } from '@shared/types/reports'
import {
  exportReportExcelService,
  exportReportPdfService,
  getReportSummaryService
} from './reports.service'

export function registerReportsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.REPORTS_SUMMARY, (_e, range: ReportDateRange) =>
    getReportSummaryService(range)
  )
  ipcMain.handle(IPC_CHANNELS.REPORTS_EXPORT_PDF, (_e, range: ReportDateRange) =>
    exportReportPdfService(range)
  )
  ipcMain.handle(IPC_CHANNELS.REPORTS_EXPORT_EXCEL, (_e, range: ReportDateRange) =>
    exportReportExcelService(range)
  )
}
