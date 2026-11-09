import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
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
    .select("storage_path")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `读取资料失败：${error.message}` }, { status: 502 });
  }
  if (!document) {
    return NextResponse.json({ error: "资料不存在或无权访问。" }, { status: 404 });
  }

  const { data, error: urlError } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(document.storage_path, 60);
  if (urlError) {
    return NextResponse.json({ error: `生成文件链接失败：${urlError.message}` }, { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl);
}
