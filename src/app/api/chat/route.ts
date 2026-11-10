import { askKnowledgeQuestion } from "@/app/actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "请求内容格式不正确。" }, { status: 400 });
  }

  const message = (body as Record<string, unknown>).message;
  if (typeof message !== "string" || !message.trim() || message.length > 1000) {
    return Response.json(
      { error: "请输入问题，且问题不能超过 1000 个字符。" },
      { status: 400 },
    );
  }

  const result = await askKnowledgeQuestion(message);
  if ("error" in result) {
    const status = result.error.startsWith("登录状态已失效")
      ? 401
      : result.error.startsWith("Supabase 尚未配置")
        ? 503
        : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json(result.data);
}
