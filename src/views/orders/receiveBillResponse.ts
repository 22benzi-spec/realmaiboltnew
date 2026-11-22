/**
 * 任务组账单 GET /admin/receive/bill_list
 * 与批量任务账单 POST /admin/receive/batch_bill
 * 的 data.bill_overview 都是 { list, total }。
 * list[] 是任务组，任务在 tasks[]，差价美元是 tasks[].arrears_usd_amount。
 * （lyx 2026-11-09 改；Apifox 拉取 2026-11-09T09:31:55.350Z）
 */
export function readReceiveBillGroups(data: any) {
  const overview = data?.bill_overview
  const groups = Array.isArray(overview?.list)
    ? overview.list
    : Array.isArray(overview)
      ? overview
      : []
  const tasks = groups.flatMap((group: any) => {
    if (!Array.isArray(group?.tasks)) return [group]
    return group.tasks.map((task: any) => ({
      ...task,
      task_basic_id: task?.task_basic_id ?? group?.task_basic_id,
      task_basics_no: task?.task_basics_no ?? group?.task_basics_no,
      employee_name: group?.employee_name,
    }))
  })
  return {
    taskBasic: data?.task_basic ?? null,
    groups,
    tasks,
    total: overview?.total ?? null,
    flowLinks: Array.isArray(data?.flow_links) ? data.flow_links : [],
  }
}

export function receiveBillUsdText(value: unknown) {
  if (value === undefined || value === null || value === '') return ''
  const text = String(value).trim()
  if (!text || Number(text) === 0) return ''
  return text
}
