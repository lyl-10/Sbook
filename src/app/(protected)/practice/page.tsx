"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  listPracticeAttempts,
  listWrongQuestions,
  submitPracticeAttempt,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useProtectedData } from "@/components/ProtectedDataProvider";
import type { PracticeAttempt, WrongQuestion } from "@/lib/database.types";

const EMPTY_QUESTIONS: WrongQuestion[] = [];
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];

export default function PracticePage() {
  const {
    wrongQuestions: cachedQuestions,
    setWrongQuestions: setCachedQuestions,
    practiceAttempts: cachedAttempts,
    setPracticeAttempts: setCachedAttempts,
  } = useProtectedData();
  const questions = cachedQuestions ?? EMPTY_QUESTIONS;
  const attempts = cachedAttempts ?? EMPTY_ATTEMPTS;
  const [questionId, setQuestionId] = useState(
    () => cachedQuestions?.[0]?.id ?? "",
  );
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(
    cachedQuestions === null || cachedAttempts === null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPracticeData = async () => {
    const [questionResult, attemptResult] = await Promise.all([
      listWrongQuestions(),
      listPracticeAttempts(),
    ]);
    if ("error" in questionResult) setError(questionResult.error);
    else {
      setCachedQuestions(questionResult.data);
      setQuestionId((current) =>
        questionResult.data.some((question) => question.id === current)
          ? current
          : (questionResult.data[0]?.id ?? ""),
      );
    }
    if ("error" in attemptResult) setError(attemptResult.error);
    else setCachedAttempts(attemptResult.data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (cachedQuestions !== null && cachedAttempts !== null) return;

    let active = true;
    const questionRequest =
      cachedQuestions === null
        ? listWrongQuestions()
        : Promise.resolve({ data: cachedQuestions });
    const attemptRequest =
      cachedAttempts === null
        ? listPracticeAttempts()
        : Promise.resolve({ data: cachedAttempts });

    void Promise.all([questionRequest, attemptRequest])
      .then(([questionResult, attemptResult]) => {
        if (!active) return;
        if ("error" in questionResult) setError(questionResult.error);
        else {
          setCachedQuestions(questionResult.data);
          setQuestionId((current) =>
            questionResult.data.some((question) => question.id === current)
              ? current
              : (questionResult.data[0]?.id ?? ""),
          );
        }
        if ("error" in attemptResult) setError(attemptResult.error);
        else setCachedAttempts(attemptResult.data);
      })
      .catch(() => {
        if (active) setError("加载练习数据失败，请检查网络后重试。");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    cachedQuestions,
    cachedAttempts,
    setCachedQuestions,
    setCachedAttempts,
  ]);

  const refresh = async () => {
    setIsLoading(true);
    await loadPracticeData();
  };

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === questionId),
    [questions, questionId],
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);
    try {
      const response = await submitPracticeAttempt(questionId, answer);
      if ("error" in response) {
        setError(response.error);
        return;
      }
      setResult({
        correctAnswer: response.data.correctAnswer,
        explanation: response.data.explanation,
      });
      setAnswer("");
      await refresh();
    } catch {
      setError("保存作答失败，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">练习</h1>
        <p className="mt-1 text-sm text-slate-500">
          从已保存的错题中选择题目，提交的答案会保存为可回看的练习记录。
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {isLoading ? (
            <p className="text-slate-500">正在加载练习题…</p>
          ) : questions.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <p>还没有可练习的错题。</p>
              <Link href="/errorbook" className="mt-3 inline-block text-blue-700 underline">
                前往错题本录入题目
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="mb-4 block text-sm font-medium text-slate-700">
                选择题目
                <select
                  value={questionId}
                  onChange={(event) => {
                    setQuestionId(event.target.value);
                    setResult(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                >
                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.question.replace(/\s+/gu, " ").slice(0, 100)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedQuestion && (
                <div className="mb-5 rounded-xl bg-blue-50 p-4">
                  <h2 className="mb-2 text-sm font-semibold text-blue-900">题目</h2>
                  <p className="whitespace-pre-wrap text-slate-800">
                    {selectedQuestion.question}
                  </p>
                  {selectedQuestion.knowledge_point && (
                    <p className="mt-3 text-sm text-blue-700">
                      知识点：{selectedQuestion.knowledge_point}
                    </p>
                  )}
                </div>
              )}

              <label className="block text-sm font-medium text-slate-700">
                我的作答
                <textarea
                  required
                  maxLength={10000}
                  rows={5}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="在这里写下你的答案"
                  className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 h-auto rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? "保存作答中…" : "提交并保存作答"}
              </Button>
            </form>
          )}

          {result && (
            <div role="status" className="mt-6 space-y-3 rounded-xl bg-green-50 p-4">
              <h2 className="font-semibold text-green-900">
                作答已保存。请对照参考答案检查。
              </h2>
              {result.correctAnswer ? (
                <p className="whitespace-pre-wrap text-slate-700">
                  <strong>正确答案：</strong>
                  {result.correctAnswer}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  该题尚未录入参考答案，可到错题本补充。
                </p>
              )}
              {result.explanation && (
                <p className="whitespace-pre-wrap text-slate-700">
                  <strong>解析：</strong>
                  {result.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">最近作答记录</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500">提交后，作答记录会显示在这里。</p>
          ) : (
            <ol className="space-y-4">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="border-l-2 border-blue-200 pl-3">
                  <time className="text-xs text-slate-400">
                    {new Date(attempt.created_at).toLocaleString()}
                  </time>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-700">
                    {attempt.question_snapshot}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">
                    {attempt.answer}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}
