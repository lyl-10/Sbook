"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "首页", href: "/", icon: "🏠" },
  { label: "对话", href: "/chat", icon: "💬" },
  { label: "个人知识库", href: "/knowledge", icon: "📚" },
  { label: "练习", href: "/practice", icon: "✏️" },
  { label: "错题本", href: "/errorbook", icon: "📕" },
];

export default function Sidebar() { // <--- 重点：必须是 export default
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("knowledge-logged-in");
    localStorage.removeItem("knowledge-user");
    window.location.href = "/login"; // 强制刷新跳转
  };

  return (
    <aside className="w-64 bg-white border-r border-blue-100 flex flex-col p-6 shadow-sm flex-shrink-0">
      <h2 className="text-xl font-bold text-blue-900 mb-8 pl-2">📖 个人知识库</h2>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                active
                  ? "bg-blue-100 text-blue-900"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
              }`}
            >
              <span className="text-xl w-7 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition font-medium"
      >
        <span className="text-xl w-7 text-center">🚪</span>
        退出登录
      </button>
    </aside>
  );
}