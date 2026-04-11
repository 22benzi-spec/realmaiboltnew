interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatJsonResult<T> {
  ok: boolean
  source: 'model' | 'unconfigured'
  data?: T
  raw_text?: string
  error?: string
}

export async function callJsonModel<T>(messages: ChatMessage[]): Promise<ChatJsonResult<T>> {
  const apiUrl = Deno.env.get('HARNESS_LLM_API_URL')?.trim()
  const apiKey = Deno.env.get('HARNESS_LLM_API_KEY')?.trim()
  const model = Deno.env.get('HARNESS_LLM_MODEL')?.trim()

  if (!apiUrl || !apiKey || !model) {
    return {
      ok: false,
      source: 'unconfigured',
      error: 'HARNESS_LLM_API_URL / HARNESS_LLM_API_KEY / HARNESS_LLM_MODEL 未配置',
    }
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  if (!response.ok) {
    return {
      ok: false,
      source: 'model',
      error: `模型调用失败: ${response.status} ${await response.text()}`,
    }
  }

  const payload = await response.json()
  const rawText = payload?.choices?.[0]?.message?.content
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      ok: false,
      source: 'model',
      error: '模型未返回可解析内容',
    }
  }

  try {
    return {
      ok: true,
      source: 'model',
      data: JSON.parse(rawText) as T,
      raw_text: rawText,
    }
  } catch (error) {
    return {
      ok: false,
      source: 'model',
      raw_text: rawText,
      error: error instanceof Error ? error.message : '模型 JSON 解析失败',
    }
  }
}
