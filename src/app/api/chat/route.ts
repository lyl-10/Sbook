import { askKnowledgeQuestion } from "@/app/actions";

export const runtime = "nodejs";
const maxRequestBytes = 4.5 * 1024 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return Response.json(
      { error: "请求过大，PNG 图片请控制在 3 MB 以内。" },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "请求内容格式不正确。" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const message = requestBody.message;
  const image = requestBody.image;
  const validMessage = typeof message === "string";
  const validImage = typeof image === "string";
  const hasMessage = validMessage && Boolean(message.trim());
  const hasImage = validImage && Boolean(image);
  if (
    (message !== undefined && !validMessage) ||
    (image !== undefined && !validImage) ||
    (validMessage && message.length > 1000) ||
    (!hasMessage && !hasImage)
  ) {
    return Response.json(
      { error: "请输入问题或附加 PNG 图片，问题不能超过 1000 个字符。" },
      { status: 400 },
    );
  }

  const result = await askKnowledgeQuestion(
    typeof message === "string" ? message : "",
    typeof image === "string" ? image : undefined,
  );
  if ("error" in result) {
    const status = result.error.startsWith("登录状态已失效")
      ? 401
      : result.error.startsWith("Supabase 尚未配置")
        ? 503
        : result.error.startsWith("PNG 图片") ||
            result.error.startsWith("请输入问题")
          ? 400
          : 502;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json(result.data);
}
