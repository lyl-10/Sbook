import Link from "next/link";
import { redirect } from "next/navigation";
import { BookBookmark, BookOpenText, PencilLine } from "lucide-react";
import ReviewDashboard, { ForgettingCurve } from "@/components/ReviewDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const [documents, questions, attempts, dueQuestions] = await Promise.all([
    supabase
      .from("knowledge_documents")
      .select("id, title, category, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("wrong_questions")
      .select("id, question, knowledge_point, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("wrong_questions")
      .select(
        "id, question, knowledge_point, review_count, next_review_at",
        { count: "exact" },
      )
      .lte("next_review_at", now)
      .order("next_review_at", { ascending: true })
      .limit(5),
  ]);
  const errors = [documents.error, questions.error, attempts.error].filter(Boolean);

  return (
    <section>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">我的学习空间</h1>
        <p className="mt-1 text-slate-500">资料、错题和练习记录会安全保存到你的账号。</p>
      </div>

      <ReviewDashboard
        dueQuestions={dueQuestions.data ?? []}
        totalDue={dueQuestions.count ?? 0}
        loadError={dueQuestions.error?.message ?? null}
      />

      {errors.length > 0 && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          无法加载部分学习数据：{errors.map((error) => error?.message).join("；")}
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "知识资料",
            count: documents.count ?? 0,
            href: "/knowledge",
            icon: BookOpenText,
          },
          {
            label: "错题",
            count: questions.count ?? 0,
            href: "/errorbook",
            icon: BookBookmark,
          },
          {
            label: "练习记录",
            count: attempts.count ?? 0,
            href: "/practice",
            icon: PencilLine,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-blue-50 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <item.icon aria-hidden="true" className="h-6 w-6 text-blue-700" />
            <p className="mt-3 text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{item.count}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">最近添加的资料</h2>
            <Link href="/knowledge" className="text-sm text-blue-700 hover:underline">
              查看全部
            </Link>
          </div>
          {documents.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {documents.data.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="truncate font-medium text-slate-700">
                    {document.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(document.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-slate-500">上传资料后，它们会显示在这里。</p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">最近添加的错题</h2>
            <Link href="/errorbook" className="text-sm text-blue-700 hover:underline">
              查看全部
            </Link>
          </div>
          {questions.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {questions.data.map((question) => (
                <li key={question.id} className="py-3">
                  <p className="line-clamp-2 text-sm font-medium text-slate-700">
                    {question.question}
                  </p>
                  {question.knowledge_point && (
                    <p className="mt-1 text-xs text-blue-700">
                      {question.knowledge_point}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-slate-500">录入错题后，可以在这里快速回顾。</p>
          )}
        </div>
      </div>

      <ForgettingCurve />
    </section>
  );
}
