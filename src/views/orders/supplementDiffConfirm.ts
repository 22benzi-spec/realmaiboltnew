/** 组账单二次确认：基础未完成/富余 + 尾款有欠/有余；按完成/截单时间推荐勾选。（lyx 2026-11-24 改） */

export type SettlementConfirmMode = 'supplement' | 'refund' | 'offset'

export type SettlementConfirmTask = {
  id: string
  taskNo: string
  asin: string
  finishedAt: string
  paymentStatus: number
  /** 绝对值 */
  amountCny: number
  amountUsd: number
  selected: boolean
}

export type SettlementConfirmGroup = {
  key: string
  batchNumber: string
  customerName: string
  /** 组内最早完成/截单时间，用于基础款排序 */
  earliestFinishedAt: string
  basicStatus: number
  /** 待收/富余绝对值 */
  basicCny: number
  basicUsd: number
  basicSelected: boolean
  tasks: SettlementConfirmTask[]
}

export type SettlementConfirmState = {
  groups: SettlementConfirmGroup[]
  activeGroupKey: string
  enteredCny: number
  enteredUsd: number
  mode: SettlementConfirmMode
}

function asNumber(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function asText(value: unknown) {
  return String(value ?? '').trim()
}

/** 完成/截单时间：优先 finished_at，否则已完成/已截单用 created_at */
export function resolveTaskFinishedAt(order: {
  finished_at?: unknown
  created_at?: unknown
  status?: unknown
  status_label?: unknown
}) {
  const finished = asText(order.finished_at)
  if (finished) return finished
  const status = Number(order.status)
  const label = asText(order.status_label)
  if (status === 3 || status === 5 || label === '已完成' || label === '已截单') {
    return asText(order.created_at) || '1970-01-01 00:00:00'
  }
  return asText(order.created_at) || '1970-01-01 00:00:00'
}

function compareTimeAsc(a: string, b: string) {
  return a.localeCompare(b)
}

/** 符号：需补/欠款为负，富余/余款为正（与确认页展示一致） */
export function signedBasicAmounts(basicStatus: number, cny: number, usd: number) {
  if (basicStatus === 2) return { cny: -Math.abs(cny), usd: -Math.abs(usd) }
  if (basicStatus === 3) return { cny: Math.abs(cny), usd: Math.abs(usd) }
  return { cny: 0, usd: 0 }
}

export function signedTailAmounts(paymentStatus: number, cny: number, usd: number) {
  if (paymentStatus === 2) return { cny: -Math.abs(cny), usd: -Math.abs(usd) }
  if (paymentStatus === 3) return { cny: Math.abs(cny), usd: Math.abs(usd) }
  return { cny: 0, usd: 0 }
}

export function canSelectBasic(basicStatus: number) {
  return basicStatus === 2 || basicStatus === 3
}

export function isTailDiffStatus(paymentStatus: unknown) {
  const status = Number(paymentStatus)
  return status === 2 || status === 3
}

function groupKeyOf(order: any) {
  return String(order?.task_basic_id ?? order?.task_basic?.id ?? order?.task_basic?.task_basics_no ?? order?.id)
}

function batchNumberOf(order: any) {
  return String(order?.task_basic?.task_basics_no || order?.task_basics_no || '-')
}

/** 从组账单本地行生成确认页分组；只收基础未完成/富余或尾款有欠/有余 */
export function buildSettlementConfirmGroups(orders: any[]): SettlementConfirmGroup[] {
  const map = new Map<string, SettlementConfirmGroup>()
  for (const order of orders) {
    const key = groupKeyOf(order)
    const finishedAt = resolveTaskFinishedAt(order)
    const basicStatus = Number(order._groupBillingStatus || order.bill?.[0]?.basic_bill_status || 1)
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        batchNumber: batchNumberOf(order),
        customerName: String(order.task_basic?.customer_name || order.employee?.name || order.customer?.name || '-'),
        earliestFinishedAt: finishedAt,
        basicStatus,
        basicCny: Math.abs(asNumber(order._groupBasicEntryCny ?? order.task_basic?.basic_entry_amount_cny)),
        basicUsd: Math.abs(asNumber(order._groupBasicEntryUsd ?? order.task_basic?.basic_entry_amount_usd)),
        basicSelected: false,
        tasks: [],
      }
      map.set(key, group)
    }
    if (compareTimeAsc(finishedAt, group.earliestFinishedAt) < 0) group.earliestFinishedAt = finishedAt
    group.basicStatus = basicStatus
    group.basicCny = Math.abs(asNumber(order._groupBasicEntryCny ?? order.task_basic?.basic_entry_amount_cny))
    group.basicUsd = Math.abs(asNumber(order._groupBasicEntryUsd ?? order.task_basic?.basic_entry_amount_usd))

    const paymentStatus = Number(order._groupPaymentStatus || order.bill?.[0]?.payment_status || 1)
    if (!isTailDiffStatus(paymentStatus)) continue
    group.tasks.push({
      id: String(order.id),
      taskNo: String(order.task_no || order.id),
      asin: String(order.product?.asin || order.asin || '-'),
      finishedAt,
      paymentStatus,
      amountCny: Math.abs(asNumber(order._groupArrearsAmount ?? order.bill?.[0]?.arrears_amount)),
      amountUsd: Math.abs(asNumber(order._groupArrearsUsd ?? order.bill?.[0]?.arrears_usd_amount)),
      selected: false,
    })
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      tasks: group.tasks.slice().sort((a, b) => compareTimeAsc(a.finishedAt, b.finishedAt) || a.id.localeCompare(b.id)),
    }))
    .filter(group => canSelectBasic(group.basicStatus) || group.tasks.length > 0)
    .sort((a, b) => compareTimeAsc(a.earliestFinishedAt, b.earliestFinishedAt) || a.batchNumber.localeCompare(b.batchNumber))
}

function canAfford(
  nextCny: number,
  nextUsd: number,
  budgetCny: number,
  budgetUsd: number,
  constrainCny: boolean,
  constrainUsd: boolean,
) {
  const needCny = -Math.min(0, nextCny)
  const needUsd = -Math.min(0, nextUsd)
  if (constrainCny && needCny > budgetCny + 1e-9) return false
  if (constrainUsd && needUsd > budgetUsd + 1e-9) return false
  return true
}

/**
 * 自动勾选：先基础（按组最早时间），再尾款（按任务完成/截单时间早→晚）；
 * 余款/富余一并计入；在录入金额可覆盖的「净需补」范围内勾选。
 * 只填人民币时不卡美元；只填美元时不卡人民币。
 */
export function applySettlementAutoSelect(
  groups: SettlementConfirmGroup[],
  enteredCny: number,
  enteredUsd: number,
  mode: SettlementConfirmMode = 'supplement',
) {
  const next = groups.map(group => ({
    ...group,
    basicSelected: false,
    tasks: group.tasks.map(task => ({ ...task, selected: false })),
  }))

  const budgetCny = Math.max(0, asNumber(enteredCny))
  const budgetUsd = Math.max(0, asNumber(enteredUsd))
  const constrainCny = budgetCny > 0 || budgetUsd <= 0
  const constrainUsd = budgetUsd > 0
  // 退款：预算覆盖「净可退」（正号一侧），把符号翻转后再用同一套「需补」判定
  const sign = mode === 'refund' ? -1 : 1
  let runCny = 0
  let runUsd = 0

  const tryAdd = (deltaCny: number, deltaUsd: number) => {
    const nextCny = runCny + deltaCny * sign
    const nextUsd = runUsd + deltaUsd * sign
    if (!canAfford(nextCny, nextUsd, budgetCny, budgetUsd, constrainCny, constrainUsd)) return false
    runCny = nextCny
    runUsd = nextUsd
    return true
  }

  const basicItems = next
    .filter(group => canSelectBasic(group.basicStatus))
    .sort((a, b) => compareTimeAsc(a.earliestFinishedAt, b.earliestFinishedAt) || a.key.localeCompare(b.key))

  for (const group of basicItems) {
    const signed = signedBasicAmounts(group.basicStatus, group.basicCny, group.basicUsd)
    if (tryAdd(signed.cny, signed.usd)) group.basicSelected = true
  }

  const tails = next
    .flatMap(group => group.tasks.map(task => ({ group, task })))
    .sort((a, b) =>
      compareTimeAsc(a.task.finishedAt, b.task.finishedAt)
      || a.task.id.localeCompare(b.task.id),
    )

  for (const { task } of tails) {
    const signed = signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd)
    if (tryAdd(signed.cny, signed.usd)) task.selected = true
  }

  return next
}

export function selectedSettlementNet(groups: SettlementConfirmGroup[]) {
  let cny = 0
  let usd = 0
  let groupCount = 0
  let taskCount = 0
  let basicCount = 0
  for (const group of groups) {
    let touched = false
    if (group.basicSelected && canSelectBasic(group.basicStatus)) {
      const signed = signedBasicAmounts(group.basicStatus, group.basicCny, group.basicUsd)
      cny += signed.cny
      usd += signed.usd
      basicCount += 1
      touched = true
    }
    for (const task of group.tasks) {
      if (!task.selected) continue
      const signed = signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd)
      cny += signed.cny
      usd += signed.usd
      taskCount += 1
      touched = true
    }
    if (touched) groupCount += 1
  }
  return { cny, usd, groupCount, taskCount, basicCount }
}

export function formatSignedMoney(value: number, empty = '—') {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0005) return empty
  const abs = Math.abs(value).toFixed(2)
  return value > 0 ? `+${abs}` : `-${abs}`
}

export function formatMoneyPair(cny: number, usd: number) {
  const parts: string[] = []
  if (Math.abs(cny) >= 0.0005) parts.push(`¥${formatSignedMoney(cny, '0.00')}`)
  if (Math.abs(usd) >= 0.0005) parts.push(`$${formatSignedMoney(usd, '0.00')}`)
  return parts.join(' / ') || '—'
}

export function groupTailSelectedCount(group: SettlementConfirmGroup) {
  return group.tasks.filter(task => task.selected).length
}

export function groupCheckState(group: SettlementConfirmGroup): 'checked' | 'unchecked' | 'indeterminate' {
  const basicOn = canSelectBasic(group.basicStatus) ? group.basicSelected : true
  const total = group.tasks.length
  const picked = groupTailSelectedCount(group)
  if (total === 0) {
    if (!canSelectBasic(group.basicStatus)) return 'unchecked'
    return group.basicSelected ? 'checked' : 'unchecked'
  }
  if (basicOn && picked === total) return 'checked'
  if ((!canSelectBasic(group.basicStatus) || !group.basicSelected) && picked === 0) return 'unchecked'
  return 'indeterminate'
}

/** 组勾选：基础（若可）+ 组下全部尾款任务 */
export function setGroupChecked(group: SettlementConfirmGroup, checked: boolean) {
  if (canSelectBasic(group.basicStatus)) group.basicSelected = checked
  group.tasks.forEach((task) => { task.selected = checked })
}

export function settlementSummaryText(groups: SettlementConfirmGroup[], enteredCny: number, enteredUsd: number) {
  const net = selectedSettlementNet(groups)
  const needCny = -Math.min(0, net.cny)
  const needUsd = -Math.min(0, net.usd)
  const enteredParts: string[] = []
  if (enteredCny > 0) enteredParts.push(`¥${enteredCny.toFixed(2)}`)
  if (enteredUsd > 0) enteredParts.push(`$${enteredUsd.toFixed(2)}`)
  const needParts: string[] = []
  if (needCny > 0) needParts.push(`¥${needCny.toFixed(2)}`)
  if (needUsd > 0) needParts.push(`$${needUsd.toFixed(2)}`)
  return {
    enteredText: enteredParts.join(' / ') || '¥0.00',
    needText: needParts.join(' / ') || '¥0.00',
    net,
  }
}

/** 兼容旧调用：只含尾款行时的打开状态 */
export function buildSupplementDiffOpenState(orders: any[]) {
  const groups = buildSettlementConfirmGroups(orders)
  const recommended = applySettlementAutoSelect(groups, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 'supplement')
  const rows = recommended.flatMap(group => group.tasks.filter(task => task.selected).map(task => ({
    id: task.id,
    dateText: task.finishedAt.slice(0, 10) || '-',
    asin: task.asin,
    paymentStatus: task.paymentStatus,
    amountCny: task.amountCny,
    amountUsd: String(task.amountUsd || ''),
  })))
  return {
    rows,
    selectedIds: rows.map(row => row.id),
  }
}

export function selectAllDiffIds(ids: string[]) {
  return [...ids]
}

export function invertDiffIds(ids: string[], selected: string[]) {
  const picked = new Set(selected)
  return ids.filter(id => !picked.has(id))
}

export function checkedDiffSummaryText(
  rows: { id: string, amountCny: unknown, amountUsd: unknown }[],
  selected: string[],
) {
  const picked = new Set(selected)
  const checked = rows.filter(row => picked.has(row.id))
  return `共${checked.length}任务`
}

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

export function selectedTaskIdsFromGroups(groups: SettlementConfirmGroup[]) {
  const ids: number[] = []
  for (const group of groups) {
    for (const task of group.tasks) {
      if (!task.selected) continue
      const id = Number(task.id)
      if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) continue
      ids.push(id)
    }
  }
  return ids
}

export function selectedBasicGroupKeys(groups: SettlementConfirmGroup[]) {
  return groups.filter(group => group.basicSelected && canSelectBasic(group.basicStatus)).map(group => group.key)
}
