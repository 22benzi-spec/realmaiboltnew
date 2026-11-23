export type FlowCategoryOption = {
  value: number
  label: string
}

export type FlowCategory = FlowCategoryOption & {
  children: FlowCategoryOption[]
}

const SUPPLEMENT_PRIMARY_LABELS = ['业务收入', '其他收入']

function readEnumMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

/** 把 GET /admin/transaction_flow/enums 的一级、二级分类转成下拉。编号用接口 key。（lyx 2026-11-10 改；Apifox 拉取 2026-11-10T11:07:27.339Z） */
export function parseTransactionFlowCategories(data: {
  transaction_type?: Record<string, string>
  flow_type?: Record<string, Record<string, string>>
} | null | undefined): FlowCategory[] {
  const types = readEnumMap(data?.transaction_type)
  const flows = readEnumMap(data?.flow_type)
  return Object.keys(types).flatMap(key => {
    const value = Number(key)
    const label = String(types[key] ?? '').trim()
    if (!Number.isInteger(value) || value <= 0 || !label) return []
    const children = Object.entries(readEnumMap(flows[key])).flatMap(([childKey, childLabel]) => {
      const childValue = Number(childKey)
      const text = String(childLabel ?? '').trim()
      if (!Number.isInteger(childValue) || childValue <= 0 || !text) return []
      return [{ value: childValue, label: text }]
    })
    return [{ value, label, children }]
  })
}

/** 录入补款仍只展示业务收入、其他收入，选项和编号来自枚举接口。 */
export function supplementPrimaryCategories(categories: FlowCategory[]) {
  return SUPPLEMENT_PRIMARY_LABELS
    .map(label => categories.find(item => item.label === label))
    .filter((item): item is FlowCategory => Boolean(item))
}

/** 打开录入补款时，有「业务收入 / 补款收入」才作为默认值。 */
export function supplementCategoryDefaults(categories: FlowCategory[]) {
  const primary = supplementPrimaryCategories(categories).find(item => item.label === '业务收入')
  const secondary = primary?.children.find(item => item.label === '补款收入')
  return {
    primary: primary?.value ?? '',
    secondary: secondary ? [secondary.value] : [] as number[],
  }
}
