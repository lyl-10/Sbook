import { getDocumentProxy, extractText } from "unpdf";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".txt", "text/plain"],
  [".md", "text/markdown"],
  [".markdown", "text/markdown"],
  [".png", "image/png"],
]);

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return failure("Supabase 尚未配置，请先按照 README 完成配置。", 503);
  }

  const supabase = await createSupabaseServerClient(true);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return failure("请先登录后再上传资料。", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return failure("无法读取上传内容，请重试。", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return failure("请选择一个非空文件。", 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return failure("单个文件不能超过 10 MB。", 413);
  }

  const safeName = file.name.replace(/[\\/\u0000-\u001f]/gu, "").trim();
  const extension = safeName.match(/\.[^.]+$/u)?.[0].toLocaleLowerCase();
  const expectedType = extension ? ALLOWED_TYPES.get(extension) : undefined;
  if (
    !expectedType ||
    (file.type !== "" &&
      file.type !== "application/octet-stream" &&
      file.type !== expectedType)
  ) {
    return failure("仅支持 PDF、TXT、Markdown 和 PNG 文件。", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let extractedText = "";
  if (expectedType === "application/pdf") {
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") return failure("文件内容不是有效的 PDF。", 400);

    try {
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > 200) {
        return failure("PDF 最多支持 200 页。", 413);
      }
      const result = await extractText(pdf, { mergePages: true });
      extractedText = result.text;
    } catch {
      return failure("无法解析该 PDF，请确认文件未损坏后重试。", 400);
    }
  } else if (expectedType === "image/png") {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!pngSignature.every((byte, index) => bytes[index] === byte)) {
      return failure("文件内容不是有效的 PNG 图片。", 400);
    }
  } else {
    try {
      extractedText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return failure("TXT/Markdown 文件必须使用 UTF-8 编码。", 400);
    }
  }

  const title = safeName.slice(0, 255);
  if (!title) return failure("文件名不能为空。", 400);

  const categoryValue = formData.get("category");
  const tagsValue = formData.get("tags");
  const category =
    typeof categoryValue === "string" ? categoryValue.trim().slice(0, 50) : "";
  const tags =
    typeof tagsValue === "string"
      ? [
          ...new Set(
            tagsValue
              .split(",")
              .map((tag) => tag.trim().slice(0, 30))
              .filter(Boolean),
          ),
        ].slice(0, 10)
      : [];
  const storagePath = `${user.id}/${crypto.randomUUID()}${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge-files")
    .upload(storagePath, new Blob([bytes], { type: expectedType }), {
      contentType: expectedType,
      upsert: false,
    });

  if (uploadError) {
    return failure(`文件上传失败：${uploadError.message}`, 502);
  }

  const { data: document, error: insertError } = await supabase
    .from("knowledge_documents")
    .insert({
      owner_id: user.id,
      title,
      storage_path: storagePath,
      mime_type: expectedType,
      size_bytes: file.size,
      category,
      tags,
      extracted_text: extractedText.slice(0, 500000),
    })
    .select("*")
    .single();

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from("knowledge-files")
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Failed to clean up uploaded file after database error", cleanupError);
    }
    return failure(`资料记录保存失败：${insertError.message}`, 502);
  }

  return NextResponse.json({ document }, { status: 201 });
}
