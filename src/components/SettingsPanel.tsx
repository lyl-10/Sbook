"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  LogOut,
  Monitor,
  Moon,
  Save,
  Settings,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  initializeTheme,
  setThemeMode,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme-preference";

const maxAvatarBytes = 3 * 1024 * 1024;
const allowedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

const themeOptions: {
  mode: ThemeMode;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    mode: "system",
    label: "跟随系统",
    description: "自动使用设备的明暗外观",
    Icon: Monitor,
  },
  {
    mode: "light",
    label: "明亮",
    description: "始终使用明亮外观",
    Icon: Sun,
  },
  {
    mode: "dark",
    label: "暗色",
    description: "始终使用暗色外观",
    Icon: Moon,
  },
];

const changelog = [
  {
    date: "2026-11-17",
    title: "个人设置中心",
    description: "新增头像和昵称设置、系统/明亮/暗色主题选择及账号退出入口。",
  },
  {
    date: "2026-11-17",
    title: "复习体验优化",
    description: "首页遗忘曲线根据错题复习次数、最近复习时间和下次计划估算。",
  },
  {
    date: "2026-11-16",
    title: "AI 学习辅助",
    description: "错题支持 AI 讲解、相似题生成和自动标签，知识资料上传后也可自动生成标签。",
  },
];

type SettingsPanelProps = {
  email: string;
  initialNickname: string;
  initialAvatarUrl: string | null;
  initialLoadError: string | null;
};

export default function SettingsPanel({
  email,
  initialNickname,
  initialAvatarUrl,
  initialLoadError,
}: SettingsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(initialNickname);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    initializeTheme();
  }, []);

  const saveNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname || trimmedNickname.length > 50) {
      setFeedback({ type: "error", message: "昵称需为 1 至 50 个字符。" });
      return;
    }

    setIsSavingNickname(true);
    setFeedback(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        setFeedback({ type: "error", message: `读取账号失败：${userError.message}` });
        return;
      }
      if (!user) {
        setFeedback({ type: "error", message: "登录状态已失效，请重新登录。" });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, nickname: trimmedNickname },
      });
      if (error) {
        setFeedback({ type: "error", message: `保存昵称失败：${error.message}` });
        return;
      }
      setNickname(trimmedNickname);
      setFeedback({ type: "success", message: "昵称已保存。" });
    } catch {
      setFeedback({ type: "error", message: "保存昵称失败，请检查网络后重试。" });
    } finally {
      setIsSavingNickname(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedAvatarTypes.includes(file.type)) {
      setFeedback({ type: "error", message: "头像仅支持 PNG、JPEG 或 WebP 图片。" });
      return;
    }
    if (file.size > maxAvatarBytes) {
      setFeedback({ type: "error", message: "头像图片不能超过 3 MB。" });
      return;
    }

    setIsUploadingAvatar(true);
    setFeedback(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        setFeedback({ type: "error", message: `读取账号失败：${userError.message}` });
        return;
      }
      if (!user) {
        setFeedback({ type: "error", message: "登录状态已失效，请重新登录。" });
        return;
      }

      const avatarPath = `${user.id}/avatar`;
      const storage = supabase.storage.from("user-avatars");
      const { error: uploadError } = await storage.upload(avatarPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "0",
      });
      if (uploadError) {
        setFeedback({ type: "error", message: `上传头像失败：${uploadError.message}` });
        return;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_path: avatarPath },
      });
      if (metadataError) {
        setFeedback({ type: "error", message: `保存头像信息失败：${metadataError.message}` });
        return;
      }

      const { data, error: signedUrlError } = await storage.createSignedUrl(
        avatarPath,
        60 * 60 * 24,
      );
      if (signedUrlError) {
        setFeedback({ type: "error", message: `生成头像链接失败：${signedUrlError.message}` });
        return;
      }

      setAvatarUrl(data.signedUrl);
      setFeedback({ type: "success", message: "头像已更新。" });
    } catch {
      setFeedback({ type: "error", message: "上传头像失败，请检查网络后重试。" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const chooseTheme = (mode: ThemeMode) => {
    const error = setThemeMode(mode);
    setFeedback(
      error
        ? { type: "error", message: error }
        : { type: "success", message: "主题偏好已保存。" },
    );
  };

  const signOut = async () => {
    setIsSigningOut(true);
    setFeedback(null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut();
      if (error) {
        setFeedback({ type: "error", message: `退出登录失败：${error.message}` });
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "退出登录失败，请检查网络后重试。" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Settings aria-hidden="true" className="h-6 w-6 text-blue-700" />
          设置
        </h1>
        <p className="mt-1 text-slate-500">管理个人资料、显示偏好和账号。</p>
      </header>

      {(feedback || initialLoadError || theme.error) && (
        <div className="space-y-2">
          {feedback && (
            <p
              role={feedback.type === "error" ? "alert" : "status"}
              className={`rounded-xl p-3 text-sm ${
                feedback.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {feedback.message}
            </p>
          )}
          {initialLoadError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {initialLoadError}
            </p>
          )}
          {theme.error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {theme.error}
            </p>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">个人资料</h2>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="用户头像" className="size-full object-cover" />
            ) : (
              <UserRound aria-hidden="true" className="size-12" />
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void uploadAvatar(event)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus aria-hidden="true" className="size-4" />
              {isUploadingAvatar ? "上传中…" : "上传头像"}
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              默认头像为用户图标；支持 PNG、JPEG、WebP，最大 3 MB。
            </p>
          </div>
        </div>

        <form onSubmit={(event) => void saveNickname(event)} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            昵称
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={50}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            邮箱
            <input
              type="email"
              value={email}
              readOnly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </label>
          <Button
            type="submit"
            disabled={isSavingNickname}
            className="bg-blue-700 text-white hover:bg-blue-800"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSavingNickname ? "保存中…" : "保存昵称"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">昼夜模式</h2>
        <p className="mt-1 text-sm text-slate-500">
          默认跟随系统，也可以手动选择明亮或暗色模式。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {themeOptions.map(({ mode, label, description, Icon }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={theme.mode === mode}
              onClick={() => chooseTheme(mode)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                theme.mode === mode
                  ? "border-blue-400 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">账号</h2>
        <p className="mt-1 text-sm text-slate-500">{email}</p>
        <Button
          type="button"
          variant="outline"
          disabled={isSigningOut}
          onClick={() => void signOut()}
          className="mt-4 text-red-600 hover:text-red-700"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {isSigningOut ? "退出中…" : "退出登录"}
        </Button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">网站更新日志</h2>
        <ol className="mt-4 space-y-5">
          {changelog.map((entry) => (
            <li
              key={`${entry.date}-${entry.title}`}
              className="border-l-2 border-blue-200 pl-4"
            >
              <time className="text-xs text-slate-500">{entry.date}</time>
              <h3 className="mt-1 text-sm font-semibold text-slate-800">
                {entry.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
