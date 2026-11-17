"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeWrongQuestionReview,
  listPracticeAttempts,
  listWrongQuestions,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useProtectedData } from "@/components/ProtectedDataProvider";
import type { PracticeAttempt, WrongQuestion } from "@/lib/database.types";

const EMPTY_QUESTIONS: WrongQuestion[] = [];
const EMPTY_ATTEMPTS: PracticeAttempt[] = [];
const maxAnswerImageBytes = 3 * 1024 * 1024;
type PracticeEvaluation = {
  verdict: "correct" | "incorrect" | "uncertain" | "unavailable";
  feedback: string;
};

type PracticeSubmission = {
  correctAnswer: string;
  correctAnswerImageUrl: string | null;
  explanation: string;
  evaluation: PracticeEvaluation;
};

const motivationalQuotes = [
  { text: "学而时习之，不亦说乎？", author: "孔子", source: "《论语·学而》" },
  { text: "温故而知新，可以为师矣。", author: "孔子", source: "《论语·为政》" },
  { text: "千里之行，始于足下。", author: "老子", source: "《道德经》" },
  {
    text: "不积跬步，无以至千里；不积小流，无以成江海。",
    author: "荀子",
    source: "《荀子·劝学》",
  },
  {
    text: "路漫漫其修远兮，吾将上下而求索。",
    author: "屈原",
    source: "《离骚》",
  },
];
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("读取作答图片失败。"));
    };
    reader.onerror = () => reject(new Error("读取作答图片失败。"));
    reader.readAsDataURL(file);
  });
}

function isPracticeSubmission(value: unknown): value is PracticeSubmission {
  if (
    typeof value !== "object" ||
    value === null ||
    !("correctAnswer" in value) ||
    typeof value.correctAnswer !== "string" ||
    !("correctAnswerImageUrl" in value) ||
    (value.correctAnswerImageUrl !== null &&
      typeof value.correctAnswerImageUrl !== "string") ||
    !("explanation" in value) ||
    typeof value.explanation !== "string" ||
    !("evaluation" in value) ||
    typeof value.evaluation !== "object" ||
    value.evaluation === null ||
    !("verdict" in value.evaluation) ||
    !("feedback" in value.evaluation) ||
    typeof value.evaluation.feedback !== "string"
  ) {
    return false;
  }
  return (
    value.evaluation.verdict === "correct" ||
    value.evaluation.verdict === "incorrect" ||
    value.evaluation.verdict === "uncertain" ||
    value.evaluation.verdict === "unavailable"
  );
}

function prioritizeQuestions(questions: WrongQuestion[]) {
  return [...questions].sort(
    (a, b) => Date.parse(a.next_review_at) - Date.parse(b.next_review_at),
  );
}

function isQuestionDue(question: WrongQuestion, asOf: number) {
  const nextReviewAt = Date.parse(question.next_review_at);
  return Number.isFinite(nextReviewAt) && nextReviewAt <= asOf;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未设置" : dateTimeFormatter.format(date);
}

export default function PracticePage() {
  const {
    wrongQuestions: cachedQuestions,
    setWrongQuestions: setCachedQuestions,
    practiceAttempts: cachedAttempts,
    setPracticeAttempts: setCachedAttempts,
  } = useProtectedData();
  const questions = cachedQuestions ?? EMPTY_QUESTIONS;
  const attempts = cachedAttempts ?? EMPTY_ATTEMPTS;
  const [questionId, setQuestionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [result, setResult] = useState<{
    correctAnswer: string;
    correctAnswerImageUrl: string | null;
    explanation: string;
    nextReviewAt: string | null;
    evaluation: PracticeEvaluation;
  } | null>(null);
  const [rewardQuote, setRewardQuote] = useState<
    (typeof motivationalQuotes)[number] | null
  >(null);
  const [scheduleWarning, setScheduleWarning] = useState("");
  const [isFreePracticeDialogOpen, setIsFreePracticeDialogOpen] = useState(false);
  const [isFreePracticeMode, setIsFreePracticeMode] = useState(false);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(
    cachedQuestions === null || cachedAttempts === null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const answerImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAsOf(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadPracticeData = async () => {
    const [questionResult, attemptResult] = await Promise.all([
      listWrongQuestions(),
      listPracticeAttempts(),
    ]);
    if ("error" in questionResult) setError(questionResult.error);
    else {
      setCachedQuestions(questionResult.data);
      setQuestionId((current) =>
        current && questionResult.data.some((question) => question.id === current)
          ? current
          : "",
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
            current && questionResult.data.some((question) => question.id === current)
              ? current
              : "",
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
  const orderedQuestions = useMemo(
    () => prioritizeQuestions(questions),
    [questions],
  );
  const dailyQuestions =
    asOf === null
      ? []
      : orderedQuestions.filter((question) => isQuestionDue(question, asOf));
  const dailyPlanCount =
    asOf === null
      ? 0
      : questions.filter((question) => isQuestionDue(question, asOf)).length;

  const clearAnswerImage = () => {
    setAnswerImage(null);
    if (answerImageInputRef.current) answerImageInputRef.current.value = "";
  };

  const selectAnswerImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      clearAnswerImage();
      setError("作答图片仅支持 PNG、JPEG 或 WebP 格式。");
      return;
    }
    if (file.size > maxAnswerImageBytes) {
      clearAnswerImage();
      setError("作答图片不能超过 3 MB。");
      return;
    }
    setError("");
    setAnswerImage(file);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setScheduleWarning("");
    setResult(null);
    setRewardQuote(null);
    if (!answer.trim() && !answerImage) {
      setError("请填写文字作答或上传作答图片。");
      return;
    }
    setIsSubmitting(true);
    try {
      const image = answerImage
        ? await readImageAsDataUrl(answerImage)
        : undefined;
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer, image }),
      });
      const responseBody: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof responseBody === "object" &&
          responseBody !== null &&
          "error" in responseBody &&
          typeof responseBody.error === "string"
            ? responseBody.error
            : "AI 判题失败，请稍后重试。";
        setError(message);
        return;
      }
      if (!isPracticeSubmission(responseBody)) {
        setError("练习提交返回了无法识别的结果，请稍后重试。");
        return;
      }

      let nextReviewAt: string | null = null;
      try {
        const reviewResponse = await completeWrongQuestionReview(questionId, true);
        if ("error" in reviewResponse) {
          setScheduleWarning(reviewResponse.error);
        } else {
          nextReviewAt = reviewResponse.data.next_review_at;
          const updatedQuestions = questions.map((question) =>
            question.id === questionId
              ? { ...question, ...reviewResponse.data }
              : question,
          );
          setCachedQuestions((current) =>
            current?.map((question) =>
              question.id === questionId
                ? { ...question, ...reviewResponse.data }
                : question,
            ) ?? current,
          );
          const nextDueQuestion = prioritizeQuestions(updatedQuestions).find(
            (question) =>
              question.id !== questionId &&
              isQuestionDue(question, Date.now()),
          );
          if (nextDueQuestion) setQuestionId(nextDueQuestion.id);
          else if (!isFreePracticeMode) setQuestionId("");
        }
      } catch {
        setScheduleWarning("作答已保存，但复习计划更新失败，请刷新后检查。");
      }

      setResult({
        correctAnswer: responseBody.correctAnswer,
        correctAnswerImageUrl: responseBody.correctAnswerImageUrl,
        explanation: responseBody.explanation,
        nextReviewAt,
        evaluation: responseBody.evaluation,
      });
      setRewardQuote(
        motivationalQuotes[
          Math.floor(Math.random() * motivationalQuotes.length)
        ],
      );
      setIsFreePracticeDialogOpen(false);
      if (isFreePracticeMode) {
        setIsFreePracticeMode(false);
        setQuestionId("");
      }
      setAnswer("");
      clearAnswerImage();
      await refresh();
    } catch {
      setError("保存作答失败，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const answerFields = (
    <>
      <label className="block text-sm font-medium text-slate-700">
        我的作答
        <textarea
          required={!answerImage}
          maxLength={10000}
          rows={5}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="可填写文字，也可上传作答图片"
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <div className="mt-3">
        <input
          ref={answerImageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          onChange={selectAnswerImage}
          aria-label="选择作答图片"
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => answerImageInputRef.current?.click()}
            className="h-auto rounded-lg px-4 py-2 text-slate-700"
          >
            {answerImage ? "更换作答图片" : "上传作答图片"}
          </Button>
          {answerImage && (
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <span className="max-w-64 truncate">{answerImage.name}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={clearAnswerImage}
                className="h-auto p-1 text-slate-500 hover:bg-transparent hover:text-red-700"
              >
                移除
              </Button>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          支持 PNG、JPEG、WebP，最大 3 MB。图片仅用于本次 AI 判题，不会保存到作答记录。
        </p>
      </div>
    </>
  );

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">练习</h1>
        <p className="mt-1 text-sm text-slate-500">
          按遗忘曲线自动安排今日练习；提交后会更新复习时间和知识点画像。
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-900">今日练习计划</h2>
        <p className="mt-1 text-sm text-blue-800">
          根据每道错题的遗忘曲线到期时间，今天安排{" "}
          <strong>{dailyPlanCount}</strong> 道复习题。
          {dailyPlanCount === 0 && " 当前没有到期题，也可以选择错题自由加练。"}
        </p>
        <p className="mt-1 text-xs text-blue-700">
          每完成一道练习都会更新该题的复习周期和薄弱点画像，并获得一句名言奖励。
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
              {isFreePracticeMode ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      先选择一道题目，再在弹窗中作答。
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsFreePracticeMode(false);
                        setIsFreePracticeDialogOpen(false);
                        setQuestionId("");
                        setAnswer("");
                        clearAnswerImage();
                      }}
                      className="h-auto rounded-lg px-4 py-2 text-slate-700"
                    >
                      返回今日计划
                    </Button>
                  </div>
                  <label className="mb-4 block text-sm font-medium text-slate-700">
                    选择题目
                    <select
                      value={questionId}
                      onChange={(event) => {
                        const nextQuestionId = event.target.value;
                        setQuestionId(nextQuestionId);
                        setResult(null);
                        setRewardQuote(null);
                        setScheduleWarning("");
                        setAnswer("");
                        clearAnswerImage();
                        setIsFreePracticeDialogOpen(Boolean(nextQuestionId));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                    >
                      <option value="">请选择一道练习题</option>
                      {orderedQuestions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.question.replace(/\s+/gu, " ").slice(0, 100)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedQuestion && (
                    <Button
                      type="button"
                      onClick={() => setIsFreePracticeDialogOpen(true)}
                      className="h-auto rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800"
                    >
                      开始作答
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {dailyQuestions.length > 0 ? (
                    <>
                      <label className="mb-4 block text-sm font-medium text-slate-700">
                        今日计划题目
                        <select
                          value={questionId}
                          onChange={(event) => {
                            setQuestionId(event.target.value);
                            setResult(null);
                            setRewardQuote(null);
                            setScheduleWarning("");
                            setAnswer("");
                            clearAnswerImage();
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                        >
                          <option value="">请选择一道练习题</option>
                          {dailyQuestions.map((question) => (
                            <option key={question.id} value={question.id}>
                              {question.question.replace(/\s+/gu, " ").slice(0, 100)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedQuestion && (
                        <>
                          <div className="mb-5 rounded-xl bg-blue-50 p-4">
                            <h2 className="mb-2 text-sm font-semibold text-blue-900">
                              题目
                            </h2>
                            <p className="whitespace-pre-wrap text-slate-800">
                              {selectedQuestion.question}
                            </p>
                            {selectedQuestion.knowledge_point && (
                              <p className="mt-3 text-sm text-blue-700">
                                知识点：{selectedQuestion.knowledge_point}
                              </p>
                            )}
                          </div>
                          {answerFields}
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-4 h-auto rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {isSubmitting ? "保存作答中…" : "提交并保存作答"}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      今天没有到期题，可以开始自由加练。
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() => {
                      setIsFreePracticeMode(true);
                      setQuestionId("");
                      setAnswer("");
                      clearAnswerImage();
                      setResult(null);
                      setRewardQuote(null);
                      setScheduleWarning("");
                    }}
                    className="mt-4 h-auto rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800"
                  >
                    开始自由加练
                  </Button>
                </>
              )}
            </form>
          )}

          {result && (
            <div
              role="status"
              className={`mt-6 space-y-3 rounded-xl p-4 ${
                result.evaluation.verdict === "correct"
                  ? "bg-green-50"
                  : result.evaluation.verdict === "incorrect"
                    ? "bg-rose-50"
                    : "bg-amber-50"
              }`}
            >
              <h2
                className={`font-semibold ${
                  result.evaluation.verdict === "correct"
                    ? "text-green-900"
                    : result.evaluation.verdict === "incorrect"
                      ? "text-rose-900"
                      : "text-amber-900"
                }`}
              >
                {result.evaluation.verdict === "correct"
                  ? "AI 判断：答案正确"
                  : result.evaluation.verdict === "incorrect"
                    ? "AI 判断：答案需要订正"
                    : result.evaluation.verdict === "uncertain"
                      ? "AI 暂无法确认，请对照参考答案"
                      : "暂未判定"}
              </h2>
              <p className="text-sm text-slate-700">{result.evaluation.feedback}</p>
              <p className="text-xs text-slate-500">
                AI 判定仅供参考；图片作答不会保存到作答记录。
              </p>
              {result.nextReviewAt && (
                <p className="text-sm text-green-800">
                  下次复习已安排在：{formatDateTime(result.nextReviewAt)}
                </p>
              )}
              {scheduleWarning && (
                <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  作答已保存，但知识点画像的复习排期未更新：{scheduleWarning}
                </p>
              )}
              {rewardQuote && (
                <blockquote className="rounded-lg border-l-4 border-green-300 bg-white/70 p-3">
                  <p className="font-medium text-green-900">“{rewardQuote.text}”</p>
                  <cite className="mt-1 block text-xs not-italic text-green-700">
                    — {rewardQuote.author}，{rewardQuote.source}
                  </cite>
                </blockquote>
              )}
              {result.correctAnswer ? (
                <p className="whitespace-pre-wrap text-slate-700">
                  <strong>正确答案：</strong>
                  {result.correctAnswer}
                </p>
              ) : result.correctAnswerImageUrl ? (
                <p className="text-sm text-slate-600">
                  本题以参考答案图片参与 AI 判题。
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  该题尚未录入参考答案，可到错题本补充。
                </p>
              )}
              {result.correctAnswerImageUrl && (
                <Image
                  src={result.correctAnswerImageUrl}
                  alt="参考答案"
                  width={720}
                  height={480}
                  unoptimized
                  className="h-auto max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                />
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

      {isFreePracticeDialogOpen && selectedQuestion && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!isSubmitting) setIsFreePracticeDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-practice-title"
            className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="free-practice-title" className="text-lg font-semibold text-slate-900">
                  自由加练
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedQuestion.knowledge_point || "错题练习"}
                </p>
              </div>
              <Button
                variant="ghost"
                type="button"
                aria-label="关闭自由加练窗口"
                disabled={isSubmitting}
                onClick={() => setIsFreePracticeDialogOpen(false)}
                className="h-auto px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl bg-blue-50 p-4">
              <p className="whitespace-pre-wrap text-slate-800">
                {selectedQuestion.question}
              </p>
            </div>
            <form onSubmit={submit}>
              {answerFields}
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsFreePracticeDialogOpen(false)}
                  className="h-auto rounded-lg px-4 py-2 text-slate-700"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-auto rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isSubmitting ? "保存作答中…" : "提交并保存作答"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
