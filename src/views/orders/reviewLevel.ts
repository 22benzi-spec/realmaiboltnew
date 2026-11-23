/**
 * 测评等级文案统一口径
 *
 * 等级 3 的展示文案为「极高等」。后端 `review_level_label` 目前仍返回旧文案
 * 「极高度测评」（接口文档 review_level 的 description 亦为 3:极高度测评），
 * 因此所有展示点必须经过本文件转换，不得直接渲染后端原始 label。
 */

export type ReviewLevelTextMode = 'full' | 'short'

/** 等级数值到短文案的映射 */
const SHORT_TEXT_BY_VALUE: Record<string, string> = {
  1: '普通',
  2: '高等',
  3: '极高等',
}

/** 历史遗留短文案到当前口径的映射 */
const LEGACY_SHORT_TEXT: Record<string, string> = {
  极高度: '极高等',
  极度: '极高等',
}

const KNOWN_SHORT_TEXT = new Set(Object.values(SHORT_TEXT_BY_VALUE))

/**
 * 把任意来源的测评等级（数值、后端 label、短文案）统一成当前口径文案。
 *
 * 无法识别的文案原样返回，避免把未知枚举吞成空值或误加「测评」后缀。
 *
 * @param value 等级数值 1/2/3，或「极高度测评」「极高等」这类文案
 * @param mode `full` 返回「极高等测评」，`short` 返回「极高等」
 */
export function formatReviewLevelText(
  value: unknown,
  mode: ReviewLevelTextMode = 'full',
): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const byValue = SHORT_TEXT_BY_VALUE[raw]
  if (byValue) return mode === 'full' ? `${byValue}测评` : byValue

  const stripped = raw.replace(/测评$/, '')
  const short = LEGACY_SHORT_TEXT[stripped] ?? stripped
  if (!KNOWN_SHORT_TEXT.has(short)) return raw

  return mode === 'full' ? `${short}测评` : short
}
