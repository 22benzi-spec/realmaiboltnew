import dayjs from 'dayjs'
import { useCurrentUser } from '../../composables/useCurrentUser'
import type { ApiResponse, CreateReceiveTaskRequest } from './formTypes'
export type { CreateReceiveTaskItem, CreateReceiveTaskRequest, CreateReceiveTaskSchedule, CreateReceiveTaskTypeCount } from './formTypes'

// Local fixtures serve the prototype form; these IDs are not business API identifiers.
export const prototypeCountries = [
  { id: 1, country: '美国', country_code: 'US', exchange_rate: 7.2388, suggest_exchange_rate: 7.2599 },
  { id: 2, country: '德国', country_code: 'DE', exchange_rate: 7.8921, suggest_exchange_rate: 7.918 },
  { id: 3, country: '英国', country_code: 'UK', exchange_rate: 9.1543, suggest_exchange_rate: 9.1875 },
  { id: 4, country: '加拿大', country_code: 'CA', exchange_rate: 5.3124, suggest_exchange_rate: 5.3368 },
]
const prototypeCustomers = [
  { id: 1001, name: '原型客户', customer_name: '原型客户公司', group_chat_name: ['原型反馈一群', '原型反馈二群'] },
  { id: 1002, name: '原型私聊客户', customer_name: '原型私聊客户公司', group_chat_name: [] },
]
const prototypeProduct = {
  asin: 'B0MOCKNEW001', brand: '原型品牌', category: '厨房用品',
  images: new URL('../../../assets/create-task-product.svg', import.meta.url).href,
  star_rating: 4.5, review_count: 128,
}

export async function getCommonOptions(_params: { types: string }) {
  return { code: 200, data: { country: prototypeCountries } }
}
export async function searchCommonEmployees(params: { keyword?: string; customer_id?: number | string }) {
  const keyword = (params.keyword || '').trim().toLowerCase()
  return { code: 200, data: prototypeCustomers.filter(item =>
    (!params.customer_id || String(item.id) === String(params.customer_id)) &&
    (!keyword || `${item.name} ${item.customer_name} ${item.id}`.toLowerCase().includes(keyword)),
  ) }
}
export function normalizeGroupChatNames(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean) : []
}
export async function getCommonAsinProduct(asin: string, _country: string): Promise<ApiResponse> {
  const saved = await getPrototypeSubmissions()
  const previous = saved.flatMap(item => Object.values(item.snapshot.tasks) as any[])
    .find(task => String(task.asin).toUpperCase() === asin.toUpperCase())
  if (previous) return { code: 200, data: {
    brand: previous.brand, category: previous.category, images: previous.imgurl_big,
    star_rating: previous.star_level, review_count: previous.score,
  } }
  if (asin.toUpperCase() === prototypeProduct.asin) return { code: 200, data: prototypeProduct }
  return { code: 404, msg: '原型中暂无该 ASIN 资料，可手动填写；示例 ASIN：B0MOCKNEW001' }
}
export function useUserStore() {
  const { currentUser } = useCurrentUser()
  return { get username() { return currentUser.value.name } }
}
export async function uploadCommonFile(file: File, onProgress?: (event: { loaded: number; total: number }) => void): Promise<ApiResponse<{ url: string; name: string }>> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
  onProgress?.({ loaded: file.size, total: file.size })
  return { code: 200, data: { url, name: file.name } }
}

export interface FormSnapshot {
  basic: Record<string, any>
  tasks: Record<string, any>
  panes: Array<{ key: string; title: string; closable: boolean }>
  offset: any
}
export interface PrototypeSubmission {
  id: string
  createdAt: string
  payload: CreateReceiveTaskRequest
  snapshot: FormSnapshot
}
function openPrototypeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('realmai-create-task-prototype', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('submissions', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('无法打开原型任务存储'))
  })
}
export async function getPrototypeSubmissions(): Promise<PrototypeSubmission[]> {
  const db = await openPrototypeDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('submissions', 'readonly').objectStore('submissions').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
export async function createReceiveTask(payload: CreateReceiveTaskRequest, snapshot: FormSnapshot): Promise<ApiResponse> {
  const entry: PrototypeSubmission = JSON.parse(JSON.stringify({
    id: `prototype-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(), payload, snapshot,
  }))
  const db = await openPrototypeDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('submissions', 'readwrite')
      tx.objectStore('submissions').add(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('原型任务保存已取消'))
    })
  } finally { db.close() }
  return { code: 200, data: entry }
}
export async function getPrototypeTaskRows(): Promise<any[]> {
  const entries = await getPrototypeSubmissions()
  const reviewNames: Record<string, string> = { free_review: '免评', words: '文字评', image: '图片评', video: '视频评', feedback: 'Feedback' }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).flatMap(entry => entry.snapshot.panes.map((pane, index) => {
    const task = entry.snapshot.tasks[pane.key]
    const types = (task.remark_type || []).map((type: string) => reviewNames[type])
    const schedules = entry.payload.tasks[index]?.schedules || []
    return {
      id: `${entry.id}-${pane.key}`, _prototype_create_task: true,
      order_number: `TASK-${dayjs(entry.createdAt).format('YYYYMMDDHHmmss')}-${index + 1}`,
      asin: task.asin, store_name: task.shop, brand_name: task.brand,
      product_name: task.product_name, product_image: task.imgurl_big, category: task.category,
      country: task.country_name, product_price: task.product_price,
      review_type: ['普通测评', '高等测评', '极高等测评'][Number(task.level) - 1],
      order_types: types, order_type: types[0], order_quantity: task.orders_number,
      total_orders: task.orders_number, total_amount: task.amount,
      customer_name: entry.snapshot.basic.customer_name,
      customer_id_str: String(entry.snapshot.basic.customer_id),
      notes: task.demand, status: '待分配', created_at: entry.createdAt, updated_at: entry.createdAt,
      _schedule_days: schedules.length,
      _schedule_count: schedules.reduce((sum, item) => sum + item.total_quantity, 0),
      _sub_total: 0, _active_sub_total: 0, _ordered_count: 0, _review_count: 0, _refunded_count: 0,
    }
  }))
}
