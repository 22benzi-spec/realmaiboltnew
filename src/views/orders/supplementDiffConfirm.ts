/** 组账单录入补款的差价二次弹窗：只处理当前页已是有欠款或有余款的行。（lyx 2026-11-12 改） */

export type SupplementDiffPlanRow = {
  id: string
  amountUsd: unknown
}

export function supplementDiffDateText(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return '-'
  const matched = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matched) return matched[1]
  return text
}

export function isSupplementDiffStatus(status: unknown) {
  return Number(status) === 2 || Number(status) === 3
}

export function selectAllDiffIds(ids: string[]) {
  return [...ids]
}

/** 每次打开确认结清都按当前核对行重新生成，并默认全选。不保留上次的表格和勾选。（lyx 2026-11-17 改） */
export type SupplementDiffOpenRow = {
  id: string
  dateText: string
  asin: string
  paymentStatus: number
  amountCny: unknown
  amountUsd: string
}

export function buildSupplementDiffOpenState<T extends {
  id: unknown
  created_at?: unknown
  asin?: unknown
  product?: { asin?: unknown }
  _groupPaymentStatus?: unknown
  _groupArrearsAmount?: unknown
  _groupArrearsUsd?: unknown
}>(orders: T[]): { rows: SupplementDiffOpenRow[], selectedIds: string[] } {
  const rows: SupplementDiffOpenRow[] = orders
    .filter(order => isSupplementDiffStatus(order._groupPaymentStatus))
    .map(order => ({
      id: String(order.id),
      dateText: supplementDiffDateText(order.created_at),
      asin: String(order.product?.asin || order.asin || '-'),
      paymentStatus: Number(order._groupPaymentStatus),
      amountCny: order._groupArrearsAmount ?? null,
      amountUsd: order._groupArrearsUsd == null ? '' : String(order._groupArrearsUsd),
    }))
  return {
    rows,
    selectedIds: selectAllDiffIds(rows.map(row => row.id)),
  }
}

export function invertDiffIds(ids: string[], selected: string[]) {
  const picked = new Set(selected)
  return ids.filter(id => !picked.has(id))
}

export function planSupplementDiffSubmit(rows: SupplementDiffPlanRow[], selected: string[]) {
  const picked = new Set(selected)
  const checked = rows.filter(row => picked.has(row.id))
  const missingUsd = checked.find(row => !String(row.amountUsd ?? '').trim())
  if (missingUsd) {
    return {
      ok: false as const,
      message: '请填写欠款金额(美元)',
      statusAction: 0,
      taskIds: [] as string[],
    }
  }
  return {
    ok: true as const,
    statusAction: 0,
    taskIds: checked.map(row => row.id),
  }
}

/** 小数位超过 3 位时截断到 2 位，不四舍五入。不超过 3 位的原文保持不动。（lyx 2026-11-12 改） */
export function truncateLongDecimalText(value: unknown) {
  const text = String(value ?? '').trim()
  const matched = text.match(/^(-?)(\d+)\.(\d+)$/)
  if (!matched || matched[3].length <= 3) return text
  return `${matched[1]}${matched[2]}.${matched[3].slice(0, 2)}`
}

function decimalParts(value: unknown) {
  const text = truncateLongDecimalText(value)
  const matched = text.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!matched) return null
  return { negative: matched[1] === '-', whole: matched[2], fraction: matched[3] ?? '' }
}

function formatScaled(amount: bigint, scale: number) {
  const negative = amount < 0n
  const digits = (negative ? -amount : amount).toString().padStart(scale + 1, '0')
  if (!scale) return `${negative ? '-' : ''}${digits}`
  const whole = digits.slice(0, digits.length - scale)
  const fraction = digits.slice(digits.length - scale)
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

/** 按原文小数位相加，不用浮点，不四舍五入。（lyx 2026-11-12 改） */
export function sumDecimalTexts(values: unknown[]) {
  const parts = values.map(decimalParts).filter(item => item !== null)
  if (!parts.length) return '0'
  const scale = Math.max(...parts.map(item => item.fraction.length))
  const total = parts.reduce((sum, item) => {
    const raw = `${item.whole}${item.fraction.padEnd(scale, '0')}`.replace(/^0+(?=\d)/, '')
    const scaled = BigInt(raw || '0')
    return sum + (item.negative ? -scaled : scaled)
  }, 0n)
  return truncateLongDecimalText(formatScaled(total, scale))
}

export function checkedDiffSummaryText(rows: { id: string, amountCny: unknown, amountUsd: unknown }[], selected: string[]) {
  const picked = new Set(selected)
  const checked = rows.filter(row => picked.has(row.id))
  const cny = sumDecimalTexts(checked.map(row => row.amountCny))
  const usd = sumDecimalTexts(checked.map(row => row.amountUsd))
  return `共${checked.length}任务，差价金额${cny}元/${usd}美元`
}

/** 确认结清勾选行的任务 id，按表格顺序各出现一次。（lyx 2026-11-12 改） */
export function billTaskIds(rows: { id: string }[], selected: string[]) {
  const picked = new Set(selected)
  const ids: number[] = []
  for (const row of rows) {
    if (!picked.has(row.id)) continue
    const id = Number(row.id)
    if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}
