"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeWrongQuestionReview } from "@/app/actions";
import { Button } from "@/components/ui/button";

const reviewIntervals = [1, 3, 7, 14, 30];
const millisecondsPerDay = 24 * 60 * 60 * 1000;

type DueQuestion = {
  id: string;
  question: string;
  knowledge_point: string;
  review_count: number;
  next_review_at: string;
};

type CurveQuestion = {
  created_at: string;
  review_count: number;
  last_reviewed_at: string | null;
  next_review_at: string;
};

function getReviewIntervalDays(question: CurveQuestion) {
  const reviewAnchor = Date.parse(question.last_reviewed_at ?? question.created_at);
  const nextReview = Date.parse(question.next_review_at);
  const scheduledDays = (nextReview - reviewAnchor) / millisecondsPerDay;

  if (Number.isFinite(scheduledDays) && scheduledDays > 0) {
    return Math.min(Math.max(scheduledDays, 1), 30);
  }

  return reviewIntervals[
    Math.min(question.review_count, reviewIntervals.length - 1)
  ];
}

export function ForgettingCurve({
  questions,
  asOf,
  loadError,
}: {
  questions: CurveQuestion[];
  asOf: string;
  loadError: string | null;
}) {
  const now = Date.parse(asOf);
  const profiles = questions.map((question) => {
    const reviewAnchor = Date.parse(
      question.last_reviewed_at ?? question.created_at,
    );
    return {
      halfLifeDays: getReviewIntervalDays(question),
      elapsedDays: Number.isFinite(reviewAnchor) && Number.isFinite(now)
        ? Math.max(0, (now - reviewAnchor) / millisecondsPerDay)
        : 0,
    };
  });
  const retentionAt = (futureDays: number) =>
    profiles.length
      ? profiles.reduce(
          (total, profile) =>
            total +
            100 *
              0.5 **
                ((profile.elapsedDays + futureDays) / profile.halfLifeDays),
          0,
        ) / profiles.length
      : 0;
  const currentRetention = retentionAt(0);
  const curvePoints = Array.from({ length: 31 }, (_, day) => ({
    day,
    x: 42 + (day / 30) * 390,
    y: 150 - (retentionAt(day) / 100) * 120,
  }));
  const curvePath = curvePoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${curvePath} L432 150 L42 150 Z`;
  const reviewTotal = questions.reduce(
    (total, question) => total + question.review_count,
    0,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">艾宾浩斯遗忘曲线</p>
        <p className="mt-1 text-xs text-slate-500">
          根据错题复习次数、最近复习时间和下次计划估算
        </p>
      </div>
      {loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          无法加载错题复习数据：{loadError}
        </p>
      ) : questions.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          添加错题后，这里会根据复习进度绘制记忆保持曲线。
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {questions.length} 道错题 · 已复习 {reviewTotal} 次 · 当前估算保留率{" "}
            {Math.round(currentRetention)}%
          </p>
          <svg
            viewBox="0 0 460 210"
            role="img"
            aria-label={`基于 ${questions.length} 道错题估算的艾宾浩斯曲线，当前平均记忆保留率约 ${Math.round(currentRetention)}%`}
            className="h-auto w-full"
          >
            <defs>
              <linearGradient id="retention-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-highlight)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--chart-highlight)" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[100, 75, 50, 25, 0].map((retention) => {
              const y = 150 - (retention / 100) * 120;
              return (
                <g key={retention}>
                  <line
                    x1="42"
                    x2="432"
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 5"
                  />
                  <text
                    x="36"
                    y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {retention}%
                  </text>
                </g>
              );
            })}
            {[0, 7, 14, 21, 30].map((day) => {
              const x = 42 + (day / 30) * 390;
              return (
                <g key={day}>
                  <line
                    x1={x}
                    x2={x}
                    y1="30"
                    y2="150"
                    stroke="#cbd5e1"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={x}
                    y="170"
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {day}
                  </text>
                </g>
              );
            })}
            <path d={areaPath} fill="url(#retention-fill)" />
            <path
              d={curvePath}
              fill="none"
              stroke="var(--chart-highlight)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <circle
              cx="42"
              cy={150 - (currentRetention / 100) * 120}
              r="4"
              fill="#fff"
              stroke="var(--chart-highlight)"
              strokeWidth="2"
            />
            <text x="237" y="195" fill="#64748b" fontSize="11" textAnchor="middle">
              从现在开始（天）
            </text>
            <text x="4" y="18" fill="#64748b" fontSize="10">
              保留率
            </text>
          </svg>
        </>
      )}
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
  const router = useRouter();
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
      router.refresh();
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
