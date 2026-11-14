"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const authErrorMessages: Record<string, string> = {
  invalid_credentials: "邮箱或密码错误，请检查后重试。",
  email_not_confirmed: "邮箱尚未验证，请先完成邮箱验证后再登录。",
  user_already_exists: "该邮箱已注册，请直接登录或使用其他邮箱。",
  email_exists: "该邮箱已注册，请直接登录或使用其他邮箱。",
  weak_password: "密码强度不足，请更换更复杂的密码。",
  email_address_invalid: "邮箱地址无效，请检查后重试。",
  signup_disabled: "当前暂不开放注册，请联系管理员。",
  email_provider_disabled: "邮箱注册暂不可用，请稍后重试。",
  over_email_send_rate_limit: "邮件发送过于频繁，请稍后再试。",
  over_request_rate_limit: "请求过于频繁，请稍后再试。",
  too_many_requests: "请求过于频繁，请稍后再试。",
};

function getAuthErrorMessage(
  error: { code?: string; message: string },
  isRegistering: boolean,
) {
  if (error.code && authErrorMessages[error.code]) {
    return authErrorMessages[error.code];
  }

  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return authErrorMessages.invalid_credentials;
  }
  if (message.includes("user already registered")) {
    return authErrorMessages.user_already_exists;
  }
  if (message.includes("email not confirmed")) {
    return authErrorMessages.email_not_confirmed;
  }

  return isRegistering ? "注册失败，请检查填写信息后重试。" : "登录失败，请稍后重试。";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!configured) {
      setError("请先配置 Supabase 后再登录。");
      return;
    }

    if (!email.trim() || password.length < 8) {
      setError("请输入有效邮箱；密码至少为 8 位。");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(getAuthErrorMessage(signUpError, true));
        } else if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("注册成功。请查看邮箱并完成验证后再登录。");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(getAuthErrorMessage(signInError, false));
        } else {
          router.replace("/");
          router.refresh();
        }
      }
    } catch {
      setError("认证服务暂时不可用，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100 px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-8">
          个人知识库
        </h1>

        {!configured && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">服务尚未配置</p>
            <p className="mt-1">
              请复制 <code>.env.example</code> 为 <code>.env.local</code>，填写 Supabase
              项目 URL 和匿名密钥，然后重启开发服务器。
            </p>
            <p className="mt-2">详细步骤请查看仓库中的 README.md。</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="mb-2 block text-slate-700">
              邮箱
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-auto rounded-xl border-gray-300 px-4 py-3 text-black focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 block text-slate-700">
              密码
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-auto rounded-xl border-gray-300 px-4 py-3 text-black focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
              placeholder="至少 8 位"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-700 text-sm text-center">{message}</p>}

          <Button
            type="submit"
            disabled={!configured || isSubmitting}
            className="mt-4 h-auto w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "请稍候…"
              : isRegistering
                ? "注册账号"
                : "登录进入系统"}
          </Button>
        </form>

        <Button
          variant="link"
          type="button"
          onClick={() => {
            setIsRegistering((value) => !value);
            setError("");
            setMessage("");
          }}
          className="mt-5 h-auto w-full text-sm font-normal text-blue-700 hover:text-blue-900"
        >
          {isRegistering ? "已有账号？返回登录" : "还没有账号？立即注册"}
        </Button>
      </div>
    </div>
  );
}