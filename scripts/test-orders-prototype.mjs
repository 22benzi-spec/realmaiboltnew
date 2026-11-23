import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { build } from 'esbuild'

const databases = new Map()
let failWrite = false
globalThis.indexedDB = {
  open(name) {
    if (!databases.has(name)) databases.set(name, new Map())
    const stores = databases.get(name)
    const request = { result: {
      close() {},
      transaction(storeName) {
        if (!stores.has(storeName)) stores.set(storeName, new Map())
        const records = stores.get(storeName)
        const transaction = {
          objectStore() { return {
            get(key) { const read = {}; queueMicrotask(() => { read.result = structuredClone(records.get(key)); read.onsuccess?.() }); return read },
            getAll() { const read = {}; queueMicrotask(() => { read.result = structuredClone([...records.values()]); read.onsuccess?.() }); return read },
            put(value, key) { queueMicrotask(() => {
              if (failWrite) { transaction.error = new Error('test write failure'); transaction.onerror?.(); return }
              records.set(key, structuredClone(value)); transaction.oncomplete?.()
            }) },
          } },
        }
        return transaction
      },
    } }
    queueMicrotask(() => request.onsuccess?.())
    return request
  },
}
const output = path.resolve('node_modules/.cache/orders-prototype-test.mjs')
await mkdir(path.dirname(output), { recursive: true })
try {
  await build({ entryPoints: ['src/views/orders/prototypeService.ts'], outfile: output, bundle: true, platform: 'node', format: 'esm', external: ['vue', 'dayjs'] })
  const service = await import(pathToFileURL(output).href)
  let result = await service.getReceiveList({ page_size: 5 })
  assert.equal(result.data.total, 36)
  assert.equal(result.data.list.length, 5)
  const secondPage = await service.getReceiveList({ page: 2, page_size: 5 })
  assert.equal(secondPage.data.list.some(row => result.data.list.some(first => first.id === row.id)), false)
  result = await service.getReceiveList({ keyword: 'RM-2026-1000' })
  const first = result.data.list[0]
  assert.equal(result.data.total, 1)
  assert.equal(first.id, 1)
  assert.equal((await service.getReceiveList({ country_id: first.country_id, employee_id: [first.employee_id], review_type: first.review_types[0] })).data.list.every(row => row.country_id === first.country_id && row.employee_id === first.employee_id), true)
  const statistics = (await service.getReceiveStatistics({ keyword: 'RM-2026-1000' })).data
  assert.equal(statistics.total_order_quantity, first.total_order_quantity)
  assert.equal(statistics.base_receivable_amount, first.base_receivable_amount)
  await service.saveReceiveFeedback({ task_id: 1, order_feedback_status: 2, order_feedback_date: '2026-11-22', comment_feedback_status: 2, comment_feedback_date: '2026-11-22', remark: '反馈验证' })
  assert.equal((await service.getReceiveDetail(1)).data.feedback[0].remark, '反馈验证')
  await service.updateReceiveBusinessRemark({ task_id: 1, business_remark: '仅本任务' })
  assert.equal((await service.getReceiveDetail(1)).data.business_remark, '仅本任务')
  assert.notEqual((await service.getReceiveDetail(2)).data.business_remark, '仅本任务')
  await service.saveReceiveBillStatus({ task_id: 1, actual_receivable_amount: '100', basic_bill_status: 2, payment_status: 2, arrears_amount: '20', arrears_usd_amount: '2', remark: '账款验证', marked_business: '原型商务' })
  assert.equal((await service.getReceiveDetail(1)).data.bill[0].arrears_usd_amount, '2')
  const record = { bill_type: 1, task_items: [{ task_id: 1, amount: 10 }, { task_id: 2, amount: 20 }], transaction_type: 1, flow_type: [2], bill_cny_amount: 30, bill_usd_amount: 0, payment_date: '2026-11-22', transfer_channel: 1, receive_account: '', surname: '', receive_name: '原型客户', voucher_path: '', status_action: 0, remark: '分摊验证' }
  const before1 = (await service.getReceiveBillDetail(1)).data.bill_details.income_flow_amount
  const before2 = (await service.getReceiveBillDetail(2)).data.bill_details.income_flow_amount
  await service.createReceiveBillRecord(record)
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.income_flow_amount, before1 + 10)
  assert.equal((await service.getReceiveBillDetail(2)).data.bill_details.income_flow_amount, before2 + 20)
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.bill_record.length, 1)
  await service.createReceiveBillRecord({ ...record, task_items: [], task_id: 1, bill_type: 2, bill_cny_amount: 5, offset_details: [{ country_id: 1, review_type: 'words', quantity: 1 }] })
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.refund_amount, 5)
  await service.createReceiveBillRecord({ ...record, task_items: [], task_id: 1, bill_type: 3, bill_cny_amount: 7, offset_type: 1, offset_task_basics: [{ task_basic_id: 2, amount: 7 }], surplus_type: [3] })
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.offset_amount, 7)
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.bill_record.at(-1).offset_task_basics[0].task_basic_id, 2)
  const batch = (await service.postReceiveBatchBill([1, 2, 3])).data
  assert.equal(batch.bill_overview.list.length, 1)
  assert.equal(batch.bill_overview.list[0].tasks.length, 3)
  assert.equal(batch.flow_links.length, 4)
  const exported = (await service.exportReceiveList({ keyword: 'RM-2026-1000' })).data
  assert.match(exported.filename, /\.xlsx$/)
  assert.equal(exported.rows.length, 2)
  assert.equal(exported.rows[0].length, 18)
  assert.equal(exported.rows[1][16], '仅本任务')
  const beforeInvalid = (await service.getReceiveBillDetail(1)).data.bill_details.bill_record.length
  await assert.rejects(service.createReceiveBillRecord({ ...record, task_items: [{ task_id: 1, amount: 1 }, { task_id: -99, amount: 1 }] }), /任务不存在/)
  assert.equal((await service.getReceiveBillDetail(1)).data.bill_details.bill_record.length, beforeInvalid)
  failWrite = true
  await assert.rejects(service.updateReceiveBusinessRemark({ task_id: 1, business_remark: '不应保存' }), /test write failure/)
  failWrite = false
  assert.equal((await service.getReceiveDetail(1)).data.business_remark, '仅本任务')
  await service.deleteReceive(1)
  assert.equal((await service.getReceiveList({ keyword: 'RM-2026-1000' })).data.total, 0)
  assert.equal(databases.get('realmai-orders-prototype').get('state').get('current').orders.some(row => row.id === 1), true)
  const reloaded = await import(pathToFileURL(output).href + '?reload=1')
  assert.equal((await reloaded.getReceiveList()).data.total, 35)
  console.log('PASS: pagination, filters, statistics, feedback, isolated remarks, billing status, supplement/refund/offset, batch allocation, export, atomic failures and persistence')
} finally { await rm(output, { force: true }) }
