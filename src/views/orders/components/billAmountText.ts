import dayjs from 'dayjs'

function billUsdText(value: unknown) {
  if (value === undefined || value === null || value === '') return ''
  const text = String(value).trim()
  if (!text || Number(text) === 0) return ''
  return text
}

function billCopyDate(createdAt: unknown) {
  const rawDate = String(createdAt || '')
  if (/^\d{2}-\d{2}/.test(rawDate)) return rawDate.slice(0, 5).replace('-', '')
  if (rawDate) return dayjs(rawDate).format('MMDD')
  return '—'
}

function formatPreservedDifference(direction: number, amountText: string, usdText?: string) {
  const usd = usdText ? ` / ${usdText}美元` : ''
  if (direction > 0) return `需补 ${amountText} 元${usd}`
  if (direction < 0) return `需退 ${amountText.replace(/^-/, '')} 元${usd}`
  return usd ? `无差价${usd}` : '无差价'
}

/** 组账单结算账单文本。美元写成「N美元」，合计行同样带美元。（lyx 2026-11-09 改，lyx 2026-11-17 改美元单位和合计） */
export function buildBillCopyText(orders: any[]) {
  const lines = orders.map((order) => {
    const explicitNeedAmount = order._bill_need_amount ?? order.arrears_amount ?? order.bill?.arrears_amount
    const amountText = String(explicitNeedAmount ?? '')
    const paymentStatus = Number(order.payment_status)
    const direction = Number(amountText) === 0 ? 0 : paymentStatus === 2 ? 1 : paymentStatus === 3 ? -1 : 0
    const usdText = billUsdText(order.arrears_usd_amount)
    return {
      date: billCopyDate(order.created_at),
      asin: order.asin || order.product?.asin || '—',
      direction,
      amountText,
      usdText,
      text: '',
    }
  }).map(line => ({
    ...line,
    text: `${line.date} ${line.asin} ${formatPreservedDifference(line.direction, line.amountText, line.usdText)}`,
  }))
  if (!lines.length) return ''
  const signedAmounts = (pick: (line: typeof lines[number]) => string) => lines.map(line => {
    const magnitude = pick(line).replace(/^-/, '')
    if (!magnitude) return '0'
    return line.direction < 0 ? `-${magnitude}` : line.direction > 0 ? magnitude : '0'
  })
  const amountText = sumBillAmountText(signedAmounts(line => line.amountText))
  const usdText = sumBillAmountText(signedAmounts(line => line.usdText))
  const totalDirection = Number(amountText) > 0 ? 1 : Number(amountText) < 0 ? -1 : 0
  const totalUsd = billUsdText(usdText.replace(/^-/, ''))
  return [...lines.map(line => line.text), `账单合计：${formatPreservedDifference(totalDirection, amountText.replace(/^-/, ''), totalUsd)}`].join('\n')
}

export function sumBillAmountText(amounts: string[]): string {
  const parts = amounts.map(amount => {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
    if (!match) return null;
    return { negative: match[1] === '-', integer: match[2], fraction: match[3] || '' };
  });
  if (parts.some(part => part === null)) return '';
  const scale = Math.max(0, ...parts.map(part => part!.fraction.length));
  const total = parts.reduce((sum, part) => {
    const value = BigInt(part!.integer + part!.fraction.padEnd(scale, '0'));
    return sum + (part!.negative ? -value : value);
  }, BigInt(0));
  const digits = (total < BigInt(0) ? -total : total).toString().padStart(scale + 1, '0');
  return `${total < BigInt(0) ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
