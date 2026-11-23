/**
 * 接单管理列表「应收基础款项」。
 * mixed 展示行上 task_usd_amount、task_cny_amount 原文；
 * pure_cny 展示 base_receivable_amount 原文。
 * （lyx 2026-11-09 改；Apifox 拉取 2026-11-09T08:32:35.549Z）
 */
export function receivableAmountText(value: unknown, symbol: "$" | "¥") {
  if (value === undefined || value === null || value === "") return "—";
  return symbol === "$" ? `$ ${value}` : `¥${value}`;
}

export function receivableBaseAmountDisplay(record: {
  task_basic?: { payment_mode?: string | null } | null
  task_usd_amount?: unknown
  task_cny_amount?: unknown
  base_receivable_amount?: unknown
}) {
  if (record?.task_basic?.payment_mode === "mixed") {
    return {
      kind: "mixed" as const,
      lines: [
        receivableAmountText(record.task_usd_amount, "$"),
        receivableAmountText(record.task_cny_amount, "¥"),
      ],
    };
  }
  return {
    kind: "pure_cny" as const,
    lines: [receivableAmountText(record?.base_receivable_amount, "¥")],
  };
}
