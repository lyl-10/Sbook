import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 尚未配置。" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient(true);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const { id } = await params;
  const { data: document, error } = await supabase
    .from("knowledge_documents")
    .select("storage_path, mime_type")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `读取资料失败：${error.message}` }, { status: 502 });
  }
  if (!document) {
    return NextResponse.json({ error: "资料不存在或无权访问。" }, { status: 404 });
  }

  const isImagePreview =
    request.nextUrl.searchParams.get("preview") === "1" &&
    document.mime_type === "image/png";
  const { data, error: urlError } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(
      document.storage_path,
      60,
      isImagePreview
        ? {
            transform: {
              width: 1200,
              height: 900,
              resize: "contain",
              quality: 75,
            },
          }
        : undefined,
    );
  if (urlError) {
    return NextResponse.json({ error: `生成文件链接失败：${urlError.message}` }, { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl);
}
