export const surplusOptions = [
  { label: '截单余款', value: 1 },
  { label: '佣金余款', value: 2 },
  { label: '其他余款', value: 3 },
]

export const surplusDetailSections = [
  { title: '截单余款明细', type: 1 },
  { title: '佣金余款明细', type: 2 },
] as const

export function emptyOffsetSource() {
  return { task_id: '', amount: undefined as number | undefined }
}

export function emptySurplusDetail() {
  return { country_id: undefined as number | undefined, review_type: '', quantity: undefined as number | undefined }
}

export function createOffsetDraft() {
  return {
    type: undefined as 1 | 2 | undefined,
    surplusTypes: [] as number[],
    sources: [emptyOffsetSource()],
    details: { 1: [emptySurplusDetail()], 2: [emptySurplusDetail()] },
  }
}

export type OffsetDraft = ReturnType<typeof createOffsetDraft>

export function cloneOffsetDraft(draft: OffsetDraft): OffsetDraft {
  return {
    type: draft.type,
    surplusTypes: [...draft.surplusTypes],
    sources: draft.sources.map(row => ({ ...row })),
    details: {
      1: draft.details[1].map(row => ({ ...row })),
      2: draft.details[2].map(row => ({ ...row })),
    },
  }
}

export function describeAttachedOffset(
  sources: { label: string; amount: number }[],
  details: { review_type: string; quantity: number }[] | undefined,
  labelOf: (reviewType: string) => string,
) {
  return {
    sourceText: sources.map(item => `${item.label} ¥${item.amount.toFixed(2)}`).join('、'),
    detailText: (details || []).map(item => `${labelOf(item.review_type)}${item.quantity}单`).join('、'),
    totalAmount: sources.reduce((sum, item) => sum + item.amount, 0),
  }
}

export function prepareOffsetDraft(draft: OffsetDraft) {
  if (!draft.type) return { error: '请选择抵消类型' } as const
  const surplusTypes = draft.type === 1 ? draft.surplusTypes : []
  if (draft.type === 1 && !surplusTypes.length) {
    return { error: '请选择截单余款、佣金余款或其他余款' } as const
  }

  const sources = draft.sources
    .filter(row => row.task_id.trim() || row.amount != null)
    .map(row => ({ task_id: row.task_id.trim(), amount: row.amount ?? 0 }))
  if (!sources.length || sources.some(row => !row.task_id || !Number.isFinite(row.amount) || row.amount <= 0)) {
    return { error: '请完整填写抵消来源任务和金额' } as const
  }

  const details: { surplus_type: 1 | 2; country_id: number; review_type: string; quantity: number }[] = []
  for (const { title, type } of surplusDetailSections) {
    if (!surplusTypes.includes(type)) continue
    const rows = draft.details[type].filter(row => row.country_id || row.review_type || row.quantity != null)
    if (!rows.length) return { error: '请完整填写' + title } as const
    for (const { country_id, review_type, quantity } of rows) {
      if (!country_id || !review_type || !quantity || !Number.isInteger(quantity) || quantity < 1) {
        return { error: '请完整填写' + title } as const
      }
      details.push({ surplus_type: type, country_id, review_type, quantity })
    }
  }

  return {
    sources,
    fields: {
      offset_type: draft.type,
      ...(surplusTypes.length ? { surplus_type: [...surplusTypes] } : {}),
      ...(details.length ? { offset_details: details } : {}),
    },
  }
}
