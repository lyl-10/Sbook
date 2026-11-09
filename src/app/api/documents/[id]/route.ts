import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 尚未配置，请先按照 README 完成配置。" },
      { status: 503 },
    );
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
  const { data: document, error: lookupError } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: `读取资料失败：${lookupError.message}` },
      { status: 502 },
    );
  }
  if (!document) {
    return NextResponse.json({ error: "资料不存在或无权删除。" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from("knowledge-files")
    .remove([document.storage_path]);
  if (storageError) {
    return NextResponse.json(
      { error: `删除文件失败：${storageError.message}` },
      { status: 502 },
    );
  }

  const { error: deleteError } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: `文件已删除，但资料记录未能删除：${deleteError.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
