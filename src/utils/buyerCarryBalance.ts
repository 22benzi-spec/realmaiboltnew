const CARRY_STORAGE_KEY = 'refund-ledger-buyer-carry-v1'

export type CarryItem = {
  sourceKey: string
  flowNo: string
  amount: number
  buyerName: string
  productId?: string
}

export type CarryStore = {
  items: CarryItem[]
  supplements: CarryItem[]
}

function emptyStore(): CarryStore {
  return { items: [], supplements: [] }
}

export function readCarryStore(): CarryStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(CARRY_STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw)
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      supplements: Array.isArray(parsed?.supplements) ? parsed.supplements : [],
    }
  } catch {
    return emptyStore()
  }
}

export function writeCarryStore(store: CarryStore) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CARRY_STORAGE_KEY, JSON.stringify(store))
}

export function carrySourceKey(record: any) {
  if (record?._batch_count > 1) {
    const ids = (record._batch_member_ids || [record.id]).slice().sort().join(',')
    return `batch:${record._batch_label || 'X'}:${ids}`
  }
  return `row:${record?.id || ''}`
}

export function isCarryPosted(record: any) {
  const sourceKey = carrySourceKey(record)
  return readCarryStore().items.some(item => item.sourceKey === sourceKey)
}

function buyerNamesOf(task: any) {
  return [task?.buyer_name, task?._buyer_name]
    .map((value: any) => String(value || '').trim())
    .filter(Boolean)
}

export function getCarryRemainingForBuyer(task: any) {
  const names = buyerNamesOf(task)
  if (!names.length) return 0
  return Number(
    readCarryStore().items
      .filter(item => names.includes(item.buyerName))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      .toFixed(2),
  )
}

export function getCarryItemsForBuyer(task: any) {
  const names = buyerNamesOf(task)
  return readCarryStore().items.filter(item => names.includes(item.buyerName))
}

function carryIdentity(record: any) {
  return {
    sourceKey: carrySourceKey(record),
    flowNo: String(record?._flow_no || record?.id || ''),
    buyerName: String(record?.buyer_name || record?.buyer_id || '').trim(),
  }
}

export function postCarryRecord(record: any, amount: number) {
  const { sourceKey, flowNo, buyerName } = carryIdentity(record)
  const store = readCarryStore()
  if (store.items.some(item => item.sourceKey === sourceKey)) return true
  if (!(amount > 0) || !buyerName) return false
  store.items.push({
    sourceKey,
    flowNo,
    amount: Number(amount.toFixed(2)),
    buyerName,
  })
  writeCarryStore(store)
  return true
}

export function getSupplementRecord(record: any) {
  const sourceKey = carrySourceKey(record)
  return readCarryStore().supplements.find(item => item.sourceKey === sourceKey) || null
}

export function getSupplementAmount(record: any) {
  return Number(getSupplementRecord(record)?.amount || 0)
}

export function saveSupplementRecord(record: any, amount: number, productId = '') {
  const { sourceKey, flowNo, buyerName } = carryIdentity(record)
  const nextAmount = Number(Number(amount || 0).toFixed(2))
  if (!(nextAmount > 0) || !buyerName) return false
  const store = readCarryStore()
  const index = store.supplements.findIndex(item => item.sourceKey === sourceKey)
  const next: CarryItem = {
    sourceKey,
    flowNo,
    amount: nextAmount,
    buyerName,
    productId: productId || undefined,
  }
  if (index >= 0) store.supplements[index] = next
  else store.supplements.push(next)
  writeCarryStore(store)
  return true
}

export function getSupplementTotalForBuyer(task: any) {
  const names = buyerNamesOf(task)
  if (!names.length) return 0
  return Number(
    readCarryStore().supplements
      .filter(item => names.includes(item.buyerName))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      .toFixed(2),
  )
}

export function toggleCarryRecord(record: any, amount: number) {
  const sourceKey = carrySourceKey(record)
  const flowNo = String(record?._flow_no || record?.id || '')
  const buyerName = String(record?.buyer_name || record?.buyer_id || '').trim()
  const store = readCarryStore()
  const index = store.items.findIndex(item => item.sourceKey === sourceKey)
  if (index >= 0) {
    store.items.splice(index, 1)
    writeCarryStore(store)
    return false
  }
  if (amount > 0 && buyerName) {
    store.items.push({
      sourceKey,
      flowNo,
      amount: Number(amount.toFixed(2)),
      buyerName,
    })
    writeCarryStore(store)
  }
  return true
}

export function applyCarryOffset(task: any, flowNo: string, amount: number) {
  const wanted = String(flowNo || '').trim()
  const offset = Number(Number(amount || 0).toFixed(2))
  if (!wanted || offset <= 0) return { ok: false, message: '请填写流水号和抵消金额' }
  const store = readCarryStore()
  const names = buyerNamesOf(task)
  const index = store.items.findIndex(item =>
    names.includes(item.buyerName) && String(item.flowNo) === wanted,
  )
  if (index < 0) return { ok: false, message: '未找到该买手对应的挂账流水号' }
  const item = store.items[index]
  if (offset - item.amount > 0.001) return { ok: false, message: '抵消金额不能大于该笔挂账金额' }
  const next = Number((item.amount - offset).toFixed(2))
  if (next <= 0) store.items.splice(index, 1)
  else store.items[index] = { ...item, amount: next }
  writeCarryStore(store)
  return { ok: true, message: '已抵消' }
}
