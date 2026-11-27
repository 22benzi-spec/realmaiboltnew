/** 账面抵消确认结算 · 方案A：被抵消来源只展示组汇总（先仅演示例启用）。 */

/** 列表置顶欠款任务（可搜） */
export const OFFSET_SETTLE_DEMO_DEBT_TASK = 'RM-TOP-DEBT'
/** 列表靠前的来源富余任务（可搜） */
export const OFFSET_SETTLE_DEMO_SRC_TASK = 'RM-TOP-SRC'
export const OFFSET_SETTLE_DEMO_SRC_BASIC_NO = 'TASK_BASIC-TOP-SRC'
export const OFFSET_SETTLE_DEMO_SRC_BASIC_ID = 9202
export const OFFSET_SETTLE_DEMO_DEBT_ID = 9201
export const OFFSET_SETTLE_DEMO_SRC_ID = 9202
/** 第二来源组（仅确认页多组排版演示） */
export const OFFSET_SETTLE_DEMO_SRC2_BASIC_NO = 'TASK_BASIC-TOP-SRC2'
export const OFFSET_SETTLE_DEMO_SRC2_BASIC_ID = 9203

export type OffsetSourceSettleCard = {
  key: string
  batchNumber: string
  customerName: string
  /** 基础入账富余（绝对值） */
  basicSurplusCny: number
  /** 尾款有余款合计（绝对值） */
  tailSurplusCny: number
  /** 本次抵消占用 */
  offsetUseCny: number
  /** 优先扣富余后：富余已用 */
  basicUsedCny: number
  /** 富余不够再扣尾款余款 */
  tailUsedCny: number
  remainBasicCny: number
  remainTailCny: number
  remainTotalCny: number
  willClear: boolean
}

function money(n: number) {
  return Number((Number(n) || 0).toFixed(2))
}

/** 优先抵消基础入账富余，再抵消尾款余款 */
export function allocateOffsetToSurplus(offsetUseCny: number, basicSurplusCny: number, tailSurplusCny: number) {
  let need = Math.max(0, money(offsetUseCny))
  const basicUsedCny = money(Math.min(need, Math.max(0, basicSurplusCny)))
  need = money(need - basicUsedCny)
  const tailUsedCny = money(Math.min(need, Math.max(0, tailSurplusCny)))
  const remainBasicCny = money(Math.max(0, basicSurplusCny) - basicUsedCny)
  const remainTailCny = money(Math.max(0, tailSurplusCny) - tailUsedCny)
  const remainTotalCny = money(remainBasicCny + remainTailCny)
  return {
    basicUsedCny,
    tailUsedCny,
    remainBasicCny,
    remainTailCny,
    remainTotalCny,
    willClear: remainTotalCny <= 0.009,
  }
}

function buildCard(params: {
  key: string
  batchNumber: string
  customerName: string
  basicSurplusCny: number
  tailSurplusCny: number
  offsetUseCny: number
}): OffsetSourceSettleCard {
  const allocated = allocateOffsetToSurplus(params.offsetUseCny, params.basicSurplusCny, params.tailSurplusCny)
  return {
    key: params.key,
    batchNumber: params.batchNumber,
    customerName: params.customerName,
    basicSurplusCny: money(params.basicSurplusCny),
    tailSurplusCny: money(params.tailSurplusCny),
    offsetUseCny: money(params.offsetUseCny),
    ...allocated,
  }
}

/** 单组演示例（补款内抵消确认） */
export function buildOffsetSettleDemoSourceCard(offsetUseCny = 200): OffsetSourceSettleCard {
  return buildCard({
    key: String(OFFSET_SETTLE_DEMO_SRC_BASIC_ID),
    batchNumber: OFFSET_SETTLE_DEMO_SRC_BASIC_NO,
    customerName: '抵消双向结清演示客户',
    basicSurplusCny: 200,
    tailSurplusCny: 50,
    offsetUseCny,
  })
}

/**
 * 纯抵消多组演示例。
 * 展示顺序：上组 → 下组；占用顺序：从最下面一组先吃满（本次抵消=该组总余额→已结清），
 * 剩余额度再落到上面一组（上面组才可能还留差价）。
 */
export function buildOffsetSettleDemoSourceCards(totalUseCny = 200): OffsetSourceSettleCard[] {
  const groups = [
    {
      key: String(OFFSET_SETTLE_DEMO_SRC_BASIC_ID),
      batchNumber: OFFSET_SETTLE_DEMO_SRC_BASIC_NO,
      customerName: '抵消双向结清演示客户',
      basicSurplusCny: 200,
      tailSurplusCny: 50,
    },
    {
      key: String(OFFSET_SETTLE_DEMO_SRC2_BASIC_ID),
      batchNumber: OFFSET_SETTLE_DEMO_SRC2_BASIC_NO,
      customerName: '抵消双向结清演示客户',
      basicSurplusCny: 80,
      tailSurplusCny: 40,
    },
  ]
  let need = money(totalUseCny)
  const uses = groups.map(() => 0)
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const avail = money(groups[index].basicSurplusCny + groups[index].tailSurplusCny)
    const use = money(Math.min(need, avail))
    uses[index] = use
    need = money(need - use)
  }
  return groups.map((group, index) => buildCard({
    ...group,
    offsetUseCny: uses[index],
  }))
}

export function isOffsetSettleDemoDebtTask(taskNo: unknown) {
  return String(taskNo || '').trim() === OFFSET_SETTLE_DEMO_DEBT_TASK
}

export function hasOffsetSettleDemoDebtOrder(orders: any[]) {
  return (orders || []).some(order => isOffsetSettleDemoDebtTask(order?.task_no))
}
