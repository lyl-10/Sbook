"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
          setError(signUpError.message);
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
          setError(signInError.message);
        } else {
          router.replace("/");
          router.refresh();
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "登录服务暂时不可用，请重试。",
      );
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
            <label htmlFor="email" className="block text-slate-700 font-medium mb-2">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition text-black"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-slate-700 font-medium mb-2">
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition text-black"
              placeholder="至少 8 位"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-700 text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={!configured || isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-xl transition active:scale-[0.98] mt-4"
          >
            {isSubmitting
              ? "请稍候…"
              : isRegistering
                ? "注册账号"
                : "登录进入系统"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegistering((value) => !value);
            setError("");
            setMessage("");
          }}
          className="mt-5 w-full text-sm text-blue-700 hover:text-blue-900"
        >
          {isRegistering ? "已有账号？返回登录" : "还没有账号？立即注册"}
        </button>
      </div>
    </div>
  );
}