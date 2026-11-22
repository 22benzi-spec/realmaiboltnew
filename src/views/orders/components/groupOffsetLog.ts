const storageKey = 'realmai:orders:group-offset-log'

type LogData = Record<string, string | number | boolean>
export type GroupOffsetTrace = (step: string, data?: LogData) => void

interface LogEntry {
  time: string
  attempt: string
  step: string
  source?: string
  data?: LogData
}

let buffered: { day: string; entries: LogEntry[] } | undefined
let attemptNumber = 0

function localDay(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-')
}

function readToday(day: string): LogEntry[] {
  if (buffered?.day !== day) buffered = undefined
  try {
    const stored = localStorage.getItem(storageKey)
    const log = stored ? JSON.parse(stored) : undefined
    if (log && log.day !== day) localStorage.removeItem(storageKey)
    const entries = log?.day === day && Array.isArray(log.entries) ? log.entries : []
    return [...entries, ...(buffered?.entries ?? [])]
  } catch {
    return buffered?.entries ?? []
  }
}

function sourcePosition(frame?: string) {
  return frame?.match(/([\w.-]+)(?:\?[^():\s]*)?:(\d+):(\d+)\)?$/)?.slice(1).join(':')
}

export function groupOffsetErrorLocation(error: unknown): LogData | undefined {
  const errorSource = error instanceof Error ? sourcePosition(error.stack?.split('\n')[1]) : undefined
  return errorSource ? { errorSource } : undefined
}

export function createGroupOffsetTrace(): GroupOffsetTrace {
  const attempt = `${Date.now().toString(36)}-${++attemptNumber}`
  return (step, data) => {
    const now = new Date()
    const day = localDay(now)
    const source = sourcePosition(new Error().stack?.split('\n')[2])
    const entry = { time: now.toISOString(), attempt, step, source, data }
    try {
      localStorage.setItem(storageKey, JSON.stringify({ day, entries: [...readToday(day), entry] }))
      buffered = undefined
    } catch {
      if (buffered?.day !== day) buffered = { day, entries: [] }
      buffered.entries.push(entry)
    }
  }
}

export function startGroupOffsetLogRetention() {
  let timer: ReturnType<typeof setTimeout>
  function schedule() {
    const now = new Date()
    readToday(localDay(now))
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    timer = setTimeout(schedule, nextDay.getTime() - now.getTime())
  }
  schedule()
  return () => clearTimeout(timer)
}

export function downloadGroupOffsetLog() {
  const day = localDay()
  const entries = readToday(day)
  const blob = new Blob([JSON.stringify({ day, entries }, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = `组账单抵消日志-${day}.json`
    link.click()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
