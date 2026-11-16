type AIResult<T> = { data: T } | { error: string };
type AIMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;
type AIMessage = { role: "system" | "user"; content: AIMessageContent };

function readAIAnswer(payload: unknown): string | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  ) {
    return null;
  }

  const choice = payload.choices[0];
  if (
    typeof choice !== "object" ||
    choice === null ||
    !("message" in choice) ||
    typeof choice.message !== "object" ||
    choice.message === null ||
    !("content" in choice.message) ||
    typeof choice.message.content !== "string"
  ) {
    return null;
  }

  return choice.message.content.trim() || null;
}

export async function completeAIChat(
  messages: AIMessage[],
  temperature = 0.2,
): Promise<AIResult<string>> {
  const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    return {
      error: "AI 尚未配置，请设置 AI_API_KEY（或 DEEPSEEK_API_KEY）和 AI_MODEL。",
    };
  }

  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/+$/u, "")}/chat/completions`);
  } catch {
    return { error: "AI_BASE_URL 不是有效的 URL。" };
  }
  if (
    endpoint.protocol !== "https:" &&
    endpoint.hostname !== "localhost" &&
    endpoint.hostname !== "127.0.0.1"
  ) {
    return { error: "AI_BASE_URL 必须使用 HTTPS（本地服务可使用 HTTP）。" };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, temperature, messages }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return {
      error: "无法连接 AI 服务，请检查 AI_BASE_URL、网络连接和服务状态。",
    };
  }

  if (!response.ok) {
    return { error: `AI 服务返回 HTTP ${response.status}，请检查服务配置。` };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { error: "AI 服务返回了无法解析的响应。" };
  }

  const answer = readAIAnswer(payload);
  if (!answer) return { error: "AI 服务没有返回有效回答，请检查模型配置。" };
  return { data: answer };
}

export async function generateAITags(
  systemPrompt: string,
  input: Record<string, string>,
  imageDataUrl?: string,
): Promise<AIResult<string[]>> {
  const userContent: AIMessageContent = imageDataUrl
    ? [
        { type: "text", text: JSON.stringify(input) },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : JSON.stringify(input);
  const result = await completeAIChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);
  if ("error" in result) return result;
  if (result.data.length > 3000) {
    return { error: "AI 返回的标签内容过长，请重试。" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.data);
  } catch {
    return { error: "AI 返回的标签格式无效，请重试。" };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("tags" in parsed) ||
    !Array.isArray(parsed.tags) ||
    parsed.tags.length < 1 ||
    parsed.tags.length > 5
  ) {
    return { error: "AI 返回的标签格式无效，请重试。" };
  }

  const tags = new Set<string>();
  for (const value of parsed.tags) {
    if (typeof value !== "string") {
      return { error: "AI 返回的标签格式无效，请重试。" };
    }

    const tag = value.trim().slice(0, 30);
    if (!tag) return { error: "AI 返回的标签内容无效，请重试。" };
    tags.add(tag);
  }

  if (tags.size === 0) return { error: "AI 没有生成有效标签，请重试。" };
  return { data: [...tags] };
}
