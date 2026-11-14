"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { label: "首页", href: "/", icon: "🏠" },
  { label: "对话", href: "/chat", icon: "💬" },
  { label: "个人知识库", href: "/knowledge", icon: "📚" },
  { label: "练习", href: "/practice", icon: "✏️" },
  { label: "错题本", href: "/errorbook", icon: "📕" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setError("");
    setIsSigningOut(true);
    try {
      const { error: signOutError } =
        await createSupabaseBrowserClient().auth.signOut();
      if (signOutError) {
        setError(`退出登录失败：${signOutError.message}`);
        setIsSigningOut(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("退出登录请求失败，请检查网络后重试。");
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="flex w-20 shrink-0 flex-col border-r border-blue-100 bg-white p-2 shadow-sm sm:w-56 sm:p-4 lg:w-64 lg:p-6">
      <h2 className="mb-6 px-2 text-center text-lg font-bold text-blue-900 sm:mb-8 sm:text-left sm:text-xl">
        <span className="sm:hidden">📖</span>
        <span className="hidden sm:inline">📖 个人知识库</span>
      </h2>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium transition sm:justify-start sm:px-3 lg:px-4 ${
                active
                  ? "bg-blue-100 text-blue-900"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
              }`}
            >
              <span className="w-7 text-center text-xl">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        onClick={handleLogout}
        disabled={isSigningOut}
        title={email}
        className="mt-4 h-auto flex items-center justify-center gap-3 rounded-xl px-2 py-3 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:justify-start sm:px-3 lg:px-4"
      >
        <span className="w-7 text-center text-xl">🚪</span>
        <span className="hidden sm:inline">
          {isSigningOut ? "退出中…" : "退出登录"}
        </span>
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </aside>
  );
}