/** 接单列表商务备注按单条任务保存。（lyx 2026-11-04 改；Apifox 2026-11-04T07:10:44.682Z 拉取） */
export interface ReceiveBusinessRemarkPayload {
  task_id: number
  business_remark: string
}

export interface BusinessRemarkSubmitResult {
  status: 'busy' | 'missing-id' | 'ok' | 'failed'
  message: string
}

/** 当前列表行 id 为操作目标任务 ID，不取批次 ID。（lyx 2026-11-04 改） */
export function readReceiveTaskId(record?: { id?: unknown } | null) {
  const value = Number(record?.id)
  return Number.isInteger(value) && value > 0 ? value : null
}

export function buildReceiveBusinessRemarkPayload(
  taskId: number,
  draft: unknown,
): ReceiveBusinessRemarkPayload {
  return {
    task_id: taskId,
    business_remark: String(draft ?? '').trim(),
  }
}

/**
 * 商务备注弹窗提交。saving 为真时不再发请求。
 * 成功后刷新列表；失败不刷新。
 */
export async function runBusinessRemarkSubmit(options: {
  saving: { value: boolean }
  taskId: number | null
  draft: unknown
  post: (payload: ReceiveBusinessRemarkPayload) => Promise<{ code?: number, msg?: string, message?: string }>
  refresh: () => Promise<void>
}): Promise<BusinessRemarkSubmitResult> {
  if (options.saving.value)
    return { status: 'busy', message: '' }
  if (options.taskId == null)
    return { status: 'missing-id', message: '缺少任务ID，无法修改商务备注' }

  options.saving.value = true
  try {
    const response = await options.post(buildReceiveBusinessRemarkPayload(options.taskId, options.draft))
    if (response.code !== 200)
      throw new Error(response.msg || response.message || '修改商务备注失败')
    await options.refresh()
    return { status: 'ok', message: '商务备注已更新' }
  }
  catch (error: any) {
    return { status: 'failed', message: error?.message || '修改商务备注失败' }
  }
  finally {
    options.saving.value = false
  }
}
