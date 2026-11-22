/**
 * 接单管理任务详情「金额明细」。
 * 混合模式美金本金只按 GET /admin/receive/get/{id} 的
 * product_price、total_order_quantity、exchange_rate、usd_buy_rate 计算。
 * （lyx 2026-11-19 改；Apifox 项目 8066432，拉取 2026-11-19T11:29:06.661Z）
 */

function rawText(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function finiteNumber(value: unknown) {
  const text = rawText(value)
  if (!text) return null
  const amount = Number(text)
  return Number.isFinite(amount) ? amount : null
}

export function isMixedReceivePayment(order: { task_basic?: { payment_mode?: unknown } | null } | null | undefined) {
  return order?.task_basic?.payment_mode === 'mixed'
}

/** （产品价格 × 接单量 × 接单汇率）/ 美元现汇买入价。现汇买入价为 0 时结果按 0 展示。字段无法取数时返回 null。 */
export function mixedUsdPrincipal(order: {
  product_price?: unknown
  total_order_quantity?: unknown
  exchange_rate?: unknown
  usd_buy_rate?: unknown
}) {
  const price = finiteNumber(order.product_price)
  const quantity = finiteNumber(order.total_order_quantity)
  const exchangeRate = finiteNumber(order.exchange_rate)
  const usdBuyRate = finiteNumber(order.usd_buy_rate)
  if (price === null || quantity === null || exchangeRate === null || usdBuyRate === null) {
    return null
  }
  if (usdBuyRate === 0) return 0
  return (price * quantity * exchangeRate) / usdBuyRate
}

export function buildMixedPrincipalView(order: {
  product_price?: unknown
  total_order_quantity?: unknown
  exchange_rate?: unknown
  usd_buy_rate?: unknown
}) {
  const amount = mixedUsdPrincipal(order)
  return {
    amountText: amount === null ? '—' : `$${amount.toFixed(2)}`,
    priceText: rawText(order.product_price) || '—',
    quantityText: rawText(order.total_order_quantity) || '—',
    exchangeRateText: rawText(order.exchange_rate) || '—',
    usdBuyRateText: rawText(order.usd_buy_rate) || '—',
  }
}
