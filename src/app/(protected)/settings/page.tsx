import { redirect } from "next/navigation";
import SettingsPanel from "@/components/SettingsPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const metadata = user.user_metadata ?? {};
  const initialNickname =
    typeof metadata.nickname === "string"
      ? metadata.nickname
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : "";
  const avatarPath =
    typeof metadata.avatar_path === "string" ? metadata.avatar_path : "";
  let initialAvatarUrl: string | null = null;
  let initialLoadError: string | null = null;

  if (avatarPath) {
    if (!avatarPath.startsWith(`${user.id}/`)) {
      initialLoadError = "头像存储路径无效，请重新上传头像。";
    } else {
      const { data, error } = await supabase.storage
        .from("user-avatars")
        .createSignedUrl(avatarPath, 60 * 60 * 24);
      if (error) initialLoadError = `无法加载头像：${error.message}`;
      else initialAvatarUrl = data.signedUrl;
    }
  }

  return (
    <SettingsPanel
      email={user.email ?? ""}
      initialNickname={initialNickname}
      initialAvatarUrl={initialAvatarUrl}
      initialLoadError={initialLoadError}
    />
  );
}
