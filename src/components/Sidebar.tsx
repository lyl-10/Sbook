"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookBookmark,
  BookOpen,
  BookOpenText,
  ChevronLeft,
  House,
  MessageCircleMore,
  PencilLine,
  Settings,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "首页", href: "/", icon: House },
  { label: "对话", href: "/chat", icon: MessageCircleMore },
  { label: "个人知识库", href: "/knowledge", icon: BookOpenText },
  { label: "练习", href: "/practice", icon: PencilLine },
  { label: "错题本", href: "/errorbook", icon: BookBookmark },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 flex h-screen w-20 shrink-0 self-start flex-col border-r border-blue-100 bg-white p-2 shadow-sm ${
        isCollapsed ? "sm:w-20 sm:p-3" : "sm:w-56 sm:p-4 lg:w-64 lg:p-6"
      }`}
    >
      <div
        className={`mb-6 flex items-center ${
          isCollapsed ? "justify-center gap-1" : "justify-between"
        } sm:mb-8`}
      >
        <h2
          className={`flex items-center gap-2 whitespace-nowrap text-lg font-bold text-blue-900 sm:text-xl ${
            isCollapsed
              ? "justify-center"
              : "w-full justify-center px-1 sm:w-auto sm:justify-start"
          }`}
        >
          <BookOpen
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[#1447e6]"
          />
          <span className={isCollapsed ? "hidden" : "hidden sm:inline"}>
            个人知识库
          </span>
        </h2>
      </div>
      <button
        type="button"
        aria-label={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        aria-expanded={!isCollapsed}
        aria-controls="primary-navigation"
        title={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        onClick={() => setIsCollapsed((current) => !current)}
        className="absolute top-4 hidden h-8 w-8 items-center justify-center rounded-lg bg-white p-0 text-slate-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex sm:-right-6"
      >
        <ChevronLeft
          aria-hidden="true"
          className={`h-5 w-5 ${isCollapsed ? "rotate-180" : ""}`}
        />
      </button>

      <nav id="primary-navigation" className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition ${
                isCollapsed
                  ? "justify-center px-2"
                  : "justify-center px-2 sm:justify-start sm:px-3 lg:px-4"
              } ${
                active
                  ? "bg-blue-100 text-blue-900"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className={isCollapsed ? "hidden" : "hidden sm:inline"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <ThemeToggle collapsed={isCollapsed} />

      <Link
        href="/settings"
        aria-label="设置"
        aria-current={pathname === "/settings" ? "page" : undefined}
        title="设置"
        className={`mt-4 flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition ${
          isCollapsed
            ? "justify-center px-2"
            : "justify-center px-2 sm:justify-start sm:px-3 lg:px-4"
        } ${
          pathname === "/settings"
            ? "bg-blue-100 text-blue-900"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
        }`}
      >
        <Settings aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className={isCollapsed ? "hidden" : "hidden sm:inline"}>
          设置
        </span>
      </Link>
    </aside>
  );
}