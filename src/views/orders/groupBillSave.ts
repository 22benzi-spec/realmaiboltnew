/** 组账单保存：结算账单备注，以及只挑出改过的账款任务。（lyx 2026-11-10 改） */

export function groupStatusEditKey(order: {
  _groupBillingStatus?: unknown
  _groupPaymentStatus?: unknown
  _groupArrearsAmount?: unknown
  _groupArrearsUsd?: unknown
}) {
  return [
    Number(order._groupBillingStatus || 1),
    Number(order._groupPaymentStatus || 1),
    Number(order._groupArrearsAmount || 0),
    String(order._groupArrearsUsd ?? '').trim(),
  ].join('|')
}

/** 组账单内嵌表格差价金额。0、空、null 打开时留空，不把 0 填进输入框；其它值保留原文。（lyx 2026-11-17 改） */
export function groupArrearsInputText(value: unknown) {
  if (value === undefined || value === null) return ''
  const text = String(value).trim()
  if (!text || /^[-+]?0+(?:\.0+)?$/.test(text)) return ''
  return text
}

/** 组账单内嵌表格差价状态。1、4 只展示当前值，不能改回；可选仍是有欠款、有余款。（lyx 2026-11-17 改） */
export function groupDiffStatusOptions(order: { _groupPaymentStatus?: unknown } | null | undefined) {
  const options = [
    { label: '有欠款', value: 2, disabled: false },
    { label: '有余款', value: 3, disabled: false },
  ]
  const current = Number(order?._groupPaymentStatus)
  if (current === 1) return [{ label: '无异常', value: 1, disabled: true }, ...options]
  if (current === 4) return [{ label: '已结清', value: 4, disabled: true }, ...options]
  return options
}

export function changedGroupStatusOrders<T extends {
  id: unknown
  _groupBillingStatus?: unknown
  _groupPaymentStatus?: unknown
  _groupArrearsAmount?: unknown
  _groupArrearsUsd?: unknown
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
