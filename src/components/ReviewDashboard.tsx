"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeWrongQuestionReview } from "@/app/actions";
import { Button } from "@/components/ui/button";

const reviewIntervals = [1, 3, 7, 14, 30];
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const roundChartCoordinate = (value: number) => Math.round(value * 1000) / 1000;

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

type KnowledgeQuestion = CurveQuestion & {
  knowledge_point: string;
  tags: string[];
};

type WeakPoint = {
  name: string;
  questionCount: number;
  dueCount: number;
  reviewCount: number;
  score: number;
  tags: Map<string, number>;
};

function getWeakPoints(questions: KnowledgeQuestion[], asOf: string) {
  const grouped = new Map<
    string,
    Omit<WeakPoint, "score"> & { retentionTotal: number }
  >();
  const now = Date.parse(asOf);

  for (const question of questions) {
    const tags = Array.from(
      new Set(question.tags.map((tag) => tag.trim()).filter(Boolean)),
    );
    const name = question.knowledge_point.trim() || "未分类知识点";
    let point = grouped.get(name);

    if (!point) {
      point = {
        name,
        questionCount: 0,
        dueCount: 0,
        reviewCount: 0,
        retentionTotal: 0,
        tags: new Map(),
      };
      grouped.set(name, point);
    }

    point.questionCount += 1;
    point.reviewCount += question.review_count;
    const reviewAnchor = Date.parse(
      question.last_reviewed_at ?? question.created_at,
    );
    const elapsedDays =
      Number.isFinite(reviewAnchor) && Number.isFinite(now)
        ? Math.max(0, (now - reviewAnchor) / millisecondsPerDay)
        : 0;
    point.retentionTotal +=
      100 * 0.5 ** (elapsedDays / getReviewIntervalDays(question));
    const nextReview = Date.parse(question.next_review_at);
    if (Number.isFinite(now) && Number.isFinite(nextReview) && nextReview <= now) {
      point.dueCount += 1;
    }

    for (const tag of tags) {
      if (tag !== name) point.tags.set(tag, (point.tags.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(grouped.values())
    .map(({ retentionTotal, ...point }) => {
      return {
        ...point,
        score: Math.round(retentionTotal / point.questionCount),
      };
    })
    .sort((a, b) => a.score - b.score || b.questionCount - a.questionCount);
}

function weaknessColor(score: number) {
  if (score >= 70) return { text: "text-emerald-700", fill: "#059669", light: "#ecfdf5" };
  if (score >= 45) return { text: "text-amber-700", fill: "#d97706", light: "#fffbeb" };
  return { text: "text-rose-700", fill: "#e11d48", light: "#fff1f2" };
}

function graphLabel(value: string) {
  const characters = Array.from(value);
  return characters.length > 15 ? `${characters.slice(0, 15).join("")}…` : value;
}

export function KnowledgeInsights({
  questions,
  asOf,
  loadError,
}: {
  questions: KnowledgeQuestion[];
  asOf: string;
  loadError: string | null;
}) {
  const weakPoints = getWeakPoints(questions, asOf);
  const graphPoints = [...weakPoints]
    .sort((a, b) => b.questionCount - a.questionCount || a.score - b.score)
    .slice(0, 6);
  const graphTags = Array.from(
    graphPoints.reduce((allTags, point) => {
      for (const [tag, count] of point.tags) {
        allTags.set(tag, (allTags.get(tag) ?? 0) + count);
      }
      return allTags;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const graphTagNames = new Set(graphTags.map(([tag]) => tag));
  const graphEdges = graphPoints.flatMap((point, pointIndex) =>
    Array.from(point.tags)
      .filter(([tag]) => graphTagNames.has(tag))
      .map(([tag, count]) => ({
        pointIndex,
        tagIndex: graphTags.findIndex(([name]) => name === tag),
        count,
      })),
  );
  const hasGraph = graphPoints.length > 0 && graphEdges.length > 0;
  const graphHeight = 350;
  const rowY = (index: number, count: number) =>
    (graphHeight / (count + 1)) * (index + 1);

  return (
    <section className="mb-8 grid gap-6 xl:grid-cols-2" aria-label="知识图谱与薄弱点画像">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">知识图谱</h2>
          <p className="mt-1 text-xs text-slate-500">
            根据错题中的知识点与 AI 标签关联，最多展示 6 个高频知识点
          </p>
        </div>
        {loadError ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            无法加载知识图谱：{loadError}
          </p>
        ) : !questions.length ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            添加错题并标注知识点后，这里会逐步生成你的知识图谱。
          </p>
        ) : hasGraph ? (
          <>
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 760 ${graphHeight}`}
                role="img"
                aria-label={`知识图谱包含 ${graphPoints.length} 个知识点和 ${graphTags.length} 个关联标签`}
                className="h-auto min-w-[560px] w-full"
              >
                {graphEdges.map((edge, index) => {
                  const sourceY = rowY(edge.pointIndex, graphPoints.length);
                  const targetY = rowY(edge.tagIndex, graphTags.length);
                  const color = weaknessColor(graphPoints[edge.pointIndex].score);
                  return (
                    <path
                      key={`${edge.pointIndex}-${edge.tagIndex}-${index}`}
                      d={`M260 ${sourceY} C350 ${sourceY}, 410 ${targetY}, 500 ${targetY}`}
                      fill="none"
                      stroke={color.fill}
                      strokeOpacity="0.35"
                      strokeWidth={Math.min(3, 1 + edge.count * 0.4)}
                    />
                  );
                })}
                {graphPoints.map((point, index) => {
                  const y = rowY(index, graphPoints.length);
                  const color = weaknessColor(point.score);
                  return (
                    <g key={point.name}>
                      <rect
                        x="24"
                        y={y - 19}
                        width="236"
                        height="38"
                        rx="12"
                        fill={color.light}
                        stroke={color.fill}
                        strokeOpacity="0.35"
                      />
                      <circle cx="43" cy={y} r="5" fill={color.fill} />
                      <text
                        x="57"
                        y={y + 4}
                        fill="#334155"
                        fontSize="13"
                        fontWeight="600"
                      >
                        {graphLabel(point.name)}
                      </text>
                      <text
                        x="245"
                        y={y + 4}
                        fill={color.fill}
                        fontSize="11"
                        textAnchor="end"
                      >
                        {point.questionCount} 题
                      </text>
                    </g>
                  );
                })}
                {graphTags.map(([tag], index) => {
                  const y = rowY(index, graphTags.length);
                  return (
                    <g key={tag}>
                      <rect
                        x="500"
                        y={y - 19}
                        width="236"
                        height="38"
                        rx="12"
                        fill="#eff6ff"
                        stroke="#bfdbfe"
                      />
                      <text
                        x="618"
                        y={y + 4}
                        fill="#1d4ed8"
                        fontSize="13"
                        textAnchor="middle"
                      >
                        {graphLabel(tag)}
                      </text>
                    </g>
                  );
                })}
                <text x="24" y="338" fill="#64748b" fontSize="11">
                  知识点
                </text>
                <text x="736" y="338" fill="#64748b" fontSize="11" textAnchor="end">
                  关联标签
                </text>
              </svg>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              连线表示知识点与标签曾出现在同一道错题中；节点颜色越偏红，越需要巩固。
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            已有错题记录，但暂无可关联的标签。补充知识点标签后，图谱会显示它们的关联。
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">薄弱点画像</h2>
          <p className="mt-1 text-xs text-slate-500">
          按最近复习时间和计划间隔估算，复习后为 100，随遗忘曲线下降；指数越低越需要复习
          </p>
        </div>
        {loadError ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            无法加载薄弱点画像：{loadError}
          </p>
        ) : weakPoints.length ? (
          <ul className="divide-y divide-slate-100">
            {weakPoints.slice(0, 5).map((point) => {
              const color = weaknessColor(point.score);
              return (
                <li key={point.name} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {point.name}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${color.text}`}>
                      巩固指数 {point.score}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${point.name}巩固指数`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={point.score}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${point.score}%`, backgroundColor: color.fill }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {point.questionCount} 道错题 · {point.dueCount} 道待复习 · 已复习{" "}
                    {point.reviewCount} 次
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            暂无错题数据，记录错题后即可生成薄弱点画像。
          </p>
        )}
      </div>
    </section>
  );
}

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
    x: roundChartCoordinate(42 + (day / 30) * 390),
    y: roundChartCoordinate(150 - (retentionAt(day) / 100) * 120),
  }));
  const curvePath = curvePoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${curvePath} L432 150 L42 150 Z`;
  const reviewTotal = questions.reduce(
    (total, question) => total + question.review_count,
    0,
  );
  const retentionPercent = Math.round(currentRetention);

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
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-600">错题总数</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold leading-none text-slate-900">
                  {questions.length}
                </span>
                <span className="text-sm font-medium text-slate-500">道</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-600">累计复习次数</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold leading-none text-slate-900">
                  {reviewTotal}
                </span>
                <span className="text-sm font-medium text-slate-500">次</span>
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium text-blue-800">
                当前估算记忆保留率
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold leading-none text-blue-800">
                  {retentionPercent}
                </span>
                <span className="text-lg font-semibold text-blue-700">%</span>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
                role="progressbar"
                aria-label="当前估算记忆保留率"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={retentionPercent}
              >
                <div
                  className="h-full rounded-full bg-blue-700 transition-[width]"
                  style={{ width: `${currentRetention}%` }}
                />
              </div>
            </div>
          </div>
          <svg
            viewBox="0 0 460 210"
            role="img"
            aria-label={`基于 ${questions.length} 道错题估算的艾宾浩斯曲线，当前平均记忆保留率约 ${retentionPercent}%`}
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
              const x = roundChartCoordinate(42 + (day / 30) * 390);
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
              cy={curvePoints[0].y}
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
