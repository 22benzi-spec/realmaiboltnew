/**
 * 编辑账款状态的美元欠款。
 * POST /admin/receive/bill_status 的 arrears_usd_amount 是 integer，描述「欠款金额(美元)」。
 * 回填取账款详情 bill[0].arrears_usd_amount 原文。只接受整数字符串，不把小数四舍五入。
 * （lyx 2026-11-09 改；Apifox 拉取 2026-11-09T08:38:53.363Z）
 */
export function parseArrearsUsdAmount(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!/^\d+(\.0+)?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function arrearsUsdAmountText(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function submittedArrearsUsdAmount(value: unknown, hasIssue: boolean) {
  if (!hasIssue) return 0;
  return parseArrearsUsdAmount(value);
}
