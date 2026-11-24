/** 组账单保存：结算账单备注，以及只挑出改过的账款任务。（lyx 2026-11-10 改） */

export function groupStatusEditKey(order: {
  _groupBillingStatus?: unknown
  _groupPaymentStatus?: unknown
  _groupArrearsAmount?: unknown
  _groupArrearsUsd?: unknown
  _groupBasicEntryCny?: unknown
  _groupBasicEntryUsd?: unknown
}) {
  return [
    Number(order._groupBillingStatus || 1),
    Number(order._groupPaymentStatus || 1),
    Number(order._groupArrearsAmount || 0),
    String(order._groupArrearsUsd ?? '').trim(),
    Number(order._groupBasicEntryCny || 0),
    Number(order._groupBasicEntryUsd || 0),
  ].join('|')
}

/** 组级待收/富余金额：0 或空打开时留空，便于编辑 */
export function groupBasicEntryInputValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.0005) return null
  return amount
}

export function canEditGroupBasicEntry(order: { _groupBillingStatus?: unknown } | null | undefined) {
  const status = Number(order?._groupBillingStatus)
  return status === 2 || status === 3
}

/** 未完成 → 待收金额；富余 → 富余金额（已完成时默认待收，输入框禁用） */
export function groupBasicEntryAmountLabel(order: { _groupBillingStatus?: unknown } | null | undefined) {
  return Number(order?._groupBillingStatus) === 3 ? '富余金额' : '待收金额'
}

export function groupBasicEntryHeaderCny(orders: Array<{ _groupBillingStatus?: unknown }> | null | undefined) {
  return `${groupBasicEntryAmountLabel(resolveGroupBasicEntryOrder(orders))}（元）`
}

export function groupBasicEntryHeaderUsd(orders: Array<{ _groupBillingStatus?: unknown }> | null | undefined) {
  return `${groupBasicEntryAmountLabel(resolveGroupBasicEntryOrder(orders))}（美元）`
}

function resolveGroupBasicEntryOrder(orders: Array<{ _groupBillingStatus?: unknown }> | null | undefined) {
  const list = orders || []
  return list.find(item => Number(item?._groupBillingStatus) === 3)
    || list.find(item => Number(item?._groupBillingStatus) === 2)
    || list[0]
    || null
}

/** 组账单内嵌表格差价金额。0、空、null 打开时留空，不把 0 填进输入框；其它值保留原文。（lyx 2026-11-17 改） */
export function groupArrearsInputText(value: unknown) {
  if (value === undefined || value === null) return ''
  const text = String(value).trim()
  if (!text || /^[-+]?0+(?:\.0+)?$/.test(text)) return ''
  return text
}

/** 组账单内嵌表格尾款状态。无异常只读；已结算(4)只读展示「-」，尾款不出现「已结算」。（lyx 2026-11-23 改） */
export function groupDiffStatusOptions(order: { _groupPaymentStatus?: unknown } | null | undefined) {
  const options = [
    { label: '有欠款', value: 2, disabled: false },
    { label: '有余款', value: 3, disabled: false },
  ]
  const current = Number(order?._groupPaymentStatus)
  if (current === 1) return [{ label: '无异常', value: 1, disabled: true }, ...options]
  if (current === 4) return [{ label: '-', value: 4, disabled: true }]
  return options
}

export function changedGroupStatusOrders<T extends {
  id: unknown
  _groupBillingStatus?: unknown
  _groupPaymentStatus?: unknown
  _groupArrearsAmount?: unknown
  _groupArrearsUsd?: unknown
  _groupBasicEntryCny?: unknown
  _groupBasicEntryUsd?: unknown
}>(
  orders: T[],
  snapshot: Record<string, string>,
) {
  return orders.filter(order => snapshot[String(order.id)] !== groupStatusEditKey(order))
}

export function billRemarkPayloads(taskBasicIds: unknown[], remark: string) {
  const ids: number[] = []
  for (const value of taskBasicIds) {
    const id = Number(value)
    if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) continue
    ids.push(id)
  }
  if (!ids.length) return { error: '缺少任务批次，无法保存' } as const
  return { payloads: ids.map(task_basic_id => ({ task_basic_id, remark })) }
}
