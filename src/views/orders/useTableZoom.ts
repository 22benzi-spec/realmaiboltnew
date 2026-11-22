import { computed, ref, type Ref } from 'vue'

/**
 * 分辨率兼容入口：页面与表格固定按 1:1 渲染
 *
 * 2026-09-28 调整：窄屏下不再使用 CSS `zoom` 缩小页面或表格。
 * 14px 正文在约 0.79 的缩放下实际只剩约 11px，且非整数缩放会让 Windows
 * 字体栅格化发虚。现在宽度不足时由表格 `scroll.x` 承担横向滚动，
 * 页面现有 flex/grid 负责响应式排版，字号、按钮和交互热区始终保持原尺寸。
 * （李运侠 改）
 *
 * 用法：
 *   const { wrapRef, zoom, scrollY } = useTableZoom(COLUMNS_TOTAL_WIDTH)
 *   <div ref="wrapRef" :style="{ zoom }">
 *     <a-table :scroll="{ x: COLUMNS_TOTAL_WIDTH, y: scrollY('calc(100vh - 310px)') }" />
 *   </div>
 *
 * 保留原 API 是为了让已接入页面无需逐个重构；`zoom` 固定为 1。
 */
export interface UseTableZoomOptions {
  /** @deprecated 已停止缩放，仅为兼容现有调用保留 */
  minZoom?: number
  /** @deprecated 已停止测量，仅为兼容现有调用保留 */
  measureParent?: boolean
  /** @deprecated 已停止测量，仅为兼容现有调用保留 */
  reservedWidth?: number
}

export function useTableZoom(
  _totalColumnsWidth: number | Ref<number> | (() => number),
  _options: UseTableZoomOptions = {},
) {
  const wrapRef = ref<HTMLElement | null>(null)
  const zoom = ref(1)

  function update() {
    zoom.value = 1
  }

  /** 保留返回 computed 的形态，兼容现有 `scroll.y` 与 CSS 变量绑定。 */
  const scrollY = (expression: string) =>
    computed(() => `calc(${expression})`)

  const bindWrap = (el: any) => {
    wrapRef.value = (el as HTMLElement) || null
  }

  return { wrapRef, bindWrap, zoom, scrollY, update }
}
