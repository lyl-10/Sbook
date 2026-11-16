"use client";

import Link from "next/link";
import { useState } from "react";
import { completeWrongQuestionReview } from "@/app/actions";
import { Button } from "@/components/ui/button";

type DueQuestion = {
  id: string;
  question: string;
  knowledge_point: string;
  review_count: number;
  next_review_at: string;
};

export function ForgettingCurve() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">遗忘曲线</p>
        <p className="mt-1 text-xs text-slate-500">
          示意记忆随时间减弱，并在间隔复习后回升
        </p>
      </div>
      <svg
        viewBox="0 0 460 210"
        role="img"
        aria-label="遗忘曲线示意图，复习间隔为 1、3、7、14、30 天"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="retention-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-highlight)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-highlight)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[30, 70, 110, 150].map((y) => (
          <line
            key={y}
            x1="42"
            x2="432"
            y1={y}
            y2={y}
            stroke="#e2e8f0"
            strokeDasharray="3 5"
          />
        ))}
        {[1, 3, 7, 14, 30].map((day) => {
          const x = 42 + (day / 30) * 390;
          return (
            <line
              key={day}
              x1={x}
              x2={x}
              y1="25"
              y2="150"
              stroke="#cbd5e1"
              strokeDasharray="3 5"
            />
          );
        })}
        <path
          d="M42 30 C48 54 53 82 55 94 L55 30 C65 44 77 63 81 76 L81 30 C101 45 119 61 133 78 L133 30 C161 45 191 63 224 80 L224 30 C276 48 341 69 432 91 L432 150 L42 150 Z"
          fill="url(#retention-fill)"
        />
        <path
          d="M42 30 C48 54 53 82 55 94 L55 30 C65 44 77 63 81 76 L81 30 C101 45 119 61 133 78 L133 30 C161 45 191 63 224 80 L224 30 C276 48 341 69 432 91"
          fill="none"
          stroke="var(--chart-highlight)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {[1, 3, 7, 14, 30].map((day) => {
          const x = 42 + (day / 30) * 390;
          return (
            <circle
              key={day}
              cx={x}
              cy="30"
              r="4"
              fill="#fff"
              stroke="var(--chart-highlight)"
              strokeWidth="2"
            />
          );
        })}
        {[0, 7, 14, 21, 30].map((day) => (
          <text
            key={day}
            x={42 + (day / 30) * 390}
            y="174"
            fill="#64748b"
            fontSize="11"
            textAnchor="middle"
          >
            {day}
          </text>
        ))}
        <text x="237" y="198" fill="#64748b" fontSize="11" textAnchor="middle">
          距上次复习（天）
        </text>
        <text x="12" y="28" fill="#64748b" fontSize="10">
          记忆
        </text>
        <text x="12" y="41" fill="#64748b" fontSize="10">
          保持
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-2" aria-label="复习间隔">
        {[1, 3, 7, 14, 30].map((day) => (
          <span
            key={day}
            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
          >
            第 {day} 天
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReviewDashboard({
  dueQuestions: initialQuestions,
  totalDue: initialTotalDue,
  loadError,
}: {
  dueQuestions: DueQuestion[];
  totalDue: number;
  loadError: string | null;
}) {
  const [dueQuestions, setDueQuestions] = useState(initialQuestions);
  const [totalDue, setTotalDue] = useState(initialTotalDue);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const completeReview = async (id: string) => {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const result = await completeWrongQuestionReview(id);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setDueQuestions((current) => current.filter((question) => question.id !== id));
      setTotalDue((current) => Math.max(0, current - 1));
      setNotice("已完成复习，复习计划已更新。");
    } catch {
      setError("更新复习计划失败，请检查网络后重试。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">今日复习</p>
          <p className="mt-1 text-xs text-slate-500">
            {loadError
              ? "复习提醒暂不可用"
              : totalDue > 0
                ? `有 ${totalDue} 道错题到期`
                : "暂时没有到期错题"}
          </p>
        </div>
        <Link
          href="/errorbook"
          className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
        >
          错题本
        </Link>
      </div>

      {loadError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          无法加载复习提醒：{loadError}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {!loadError && dueQuestions.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {dueQuestions.map((question) => (
            <li key={question.id} className="py-3 first:pt-0 last:pb-0">
              <p className="line-clamp-2 text-sm font-medium text-slate-800">
                {question.question}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {question.knowledge_point || `已复习 ${question.review_count} 次`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId !== null}
                  onClick={() => void completeReview(question.id)}
                  className="h-auto rounded-lg bg-blue-700 px-3 py-1.5 text-xs text-white hover:bg-blue-800"
                >
                  {busyId === question.id ? "更新中…" : "完成复习"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : !loadError ? (
        <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-600">
            {totalDue > 0
              ? `当前列表已完成，还有 ${totalDue} 道到期错题。`
              : "按计划复习错题，系统会自动安排下一次提醒。"}
          </p>
          {totalDue === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              新增错题后，将在 1 天后首次提醒。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
