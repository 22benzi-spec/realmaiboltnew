import { message } from 'ant-design-vue'
import { createOrdersWorkbook } from './workbook'
export { formatReviewLevelText } from './reviewLevel'
export function useSettingStore() { return { theme: { mode: 'light' } } }
export async function runExportDownload(result: { rows: unknown[][]; filename: string }) {
  const blob = new Blob([createOrdersWorkbook(result.rows)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { status: 'downloaded' }
}
export function notifyExportDownload(_result: unknown) { message.success('导出成功') }
