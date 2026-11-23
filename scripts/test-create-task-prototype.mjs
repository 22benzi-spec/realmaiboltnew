import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { build } from 'esbuild'

const records = new Map()
let failWrite = false
globalThis.indexedDB = {
  open() {
    const request = {}
    request.result = {
      close() {},
      transaction(_name, mode) {
        const tx = {
          objectStore() {
            return {
              add(value) {
                queueMicrotask(() => {
                  if (failWrite) { tx.error = new Error('test storage failure'); tx.onerror?.(); return }
                  records.set(value.id, structuredClone(value))
                  tx.oncomplete?.()
                })
              },
              getAll() {
                const read = {}
                queueMicrotask(() => { read.result = structuredClone([...records.values()]); read.onsuccess?.() })
                return read
              },
            }
          },
        }
        return tx
      },
    }
    queueMicrotask(() => request.onsuccess?.())
    return request
  },
}

const output = path.resolve('node_modules/.cache/create-task-prototype-test.mjs')
await mkdir(path.dirname(output), { recursive: true })
try {
  await build({ entryPoints: ['src/components/create-task/dataSource.ts'], outfile: output, bundle: true, platform: 'node', format: 'esm', external: ['vue', 'dayjs'] })
  const { createReceiveTask, getPrototypeSubmissions, getPrototypeTaskRows, getCommonAsinProduct } = await import(pathToFileURL(output).href)
  const payload = {
    payment_mode: 'pure_cny', actual_cny_amount: 0, actual_usd_amount: 0,
    batch_collection: [{ actual_cny_amount: 0, transfer_channel: 2 }],
    tasks: [{ asin: 'B0TEST001', total_order_quantity: 2, schedules: [{ schedule_date: '2026-11-24', total_quantity: 2, type_counts: [{ review: 'words', keyword: 'bamboo board', schedule_num: 2 }] }] }],
  }
  const snapshot = {
    basic: { customer_id: 1001, customer_name: '原型客户', group_chat_name: '原型反馈一群', upload_bill: 'data:image/png;base64,test-image', business_remarks: '完整保留' },
    panes: [{ key: 'task-1', title: '任务1', closable: false }],
    tasks: { 'task-1': { asin: 'B0TEST001', shop: '验证店铺', country_name: '美国', level: 2, remark_type: ['words'], orders_number: 2, product_price: 15.99, brand: '保存品牌', category: '保存类目', variants_type: 2, variants: ['红色-L', '蓝色-M'], task_relation: 3, related_shops: ['关联店铺'], is_send_msg: 2, daily_feedback: 1, keyword_list: [{ keyword: 'bamboo board', type: 1 }], orders_date_plans: { '2026-11-24': { words: { order_num: 2, keyword_plans: [{ keyword: 'bamboo board', num: 2, type: 1 }] } } } } },
    offset: { record: { offset_type: 2, offset_task_basics: [{ task_basic_id: 'prototype-source', amount: 12.5 }] } },
  }
  const response = await createReceiveTask(payload, snapshot)
  assert.equal(response.code, 200)
  assert.equal(records.size, 1)
  snapshot.tasks['task-1'].variants.push('后续编辑不应污染已保存数据')
  const saved = await getPrototypeSubmissions()
  assert.deepEqual(saved[0].snapshot.tasks['task-1'].variants, ['红色-L', '蓝色-M'])
  assert.deepEqual(saved[0].payload.batch_collection, [{ actual_cny_amount: 0, transfer_channel: 2 }])
  assert.equal(saved[0].snapshot.basic.upload_bill, 'data:image/png;base64,test-image')
  assert.equal(saved[0].snapshot.offset.record.offset_task_basics[0].amount, 12.5)
  assert.deepEqual(saved[0].snapshot.tasks['task-1'].orders_date_plans, snapshot.tasks['task-1'].orders_date_plans)
  const rows = await getPrototypeTaskRows()
  assert.equal(rows[0].asin, 'B0TEST001')
  assert.equal(rows[0]._schedule_count, 2)
  assert.equal(rows[0].customer_name, '原型客户')
  assert.equal((await getCommonAsinProduct('B0TEST001', '美国')).data.brand, '保存品牌')
  failWrite = true
  await assert.rejects(createReceiveTask(payload, snapshot), /test storage failure/)
  assert.equal(records.size, 1)
  console.log('PASS: full snapshot, zero receipt, offset, schedule, list mapping, immutable persistence and failed writes')
} finally {
  await rm(output, { force: true })
}
