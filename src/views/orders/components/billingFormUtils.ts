export const BASIC_BILLING_STATUS_OPTIONS = [
  { label: '已完成', value: 1 },
  { label: '未完成', value: 2 },
  { label: '富余', value: 3 },
] as const

export function resolveMarkedBusinessName(order: any) {
  return String(order?.creator?.real_name || '').trim()
}

export function resolveSupplementPayerName(source: any) {
  return String(source?.employee?.name || source?.employee_name || '').trim()
}

export function resolveCustomerContactName(source: any) {
  return String(
    source?.employee?.name
    || source?.task_basic?.employee_name
    || source?.employee_name
    || ''
  ).trim()
}

export function formatCustomerFilterLabel(item: any) {
  const name = String(item?.name ?? '').trim()
  const id = item?.id
  const hasId = id !== undefined && id !== null && String(id).trim() !== ''
  const idText = hasId ? `ID: ${String(id).trim()}` : ''
  if (name && idText) return `${name} (${idText})`
  return name || idText
}

/** 接单统计 arrears_usd_amount 按接口原文展示，不补小数、不加正号。（lyx 2026-11-09 改） */
export function formatStatisticsArrearsUsd(value: unknown) {
  if (value === undefined || value === null || value === '') return '$0'
  const text = String(value).trim()
  if (!text) return '$0'
  if (text.startsWith('-')) return `-$${text.slice(1)}`
  return `$${text}`
}

export function formatSignedCurrency(value: unknown, symbol: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${symbol}0.00`
  const text = Math.abs(amount).toFixed(2)
  if (amount > 0) return `+${symbol}${text}`
  if (amount < 0) return `-${symbol}${text}`
  return `${symbol}${text}`
}

/** 实收基础款项都是收入，正数不加 +。负数仍保留 -，避免把异常负值显示成收入。 */
export function formatIncomeCurrency(value: unknown, symbol: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${symbol}0.00`
  const text = Math.abs(amount).toFixed(2)
  if (amount < 0) return `-${symbol}${text}`
  return `${symbol}${text}`
}

export function isMixedPaymentModeGroup(group: any[]) {
  return group.some(row => row?.task_basic?.payment_mode === 'mixed')
}

export function appendPastedImages(existingFiles: any[], clipboardFiles: File[], maxCount = 5) {
  const files = [...existingFiles]
  let addedCount = 0

  for (const file of clipboardFiles) {
    if (!file.type.startsWith('image/') || files.length >= maxCount) continue
    files.push({
      uid: `paste-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name || `pasted-image-${Date.now()}.png`,
      status: 'done',
      originFileObj: file,
    })
    addedCount += 1
  }

  return {
    files,
    addedCount,
    limitReached: clipboardFiles.some(file => file.type.startsWith('image/')) && files.length >= maxCount && addedCount === 0,
  }
}
