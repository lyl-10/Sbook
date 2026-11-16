"use client";

import { useEffect, useState } from "react";
import { Trash } from "lucide-react";
import {
  deleteWrongQuestion,
  explainWrongQuestion,
  generateSimilarWrongQuestions,
  listWrongQuestions,
  saveWrongQuestion,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useProtectedData } from "@/components/ProtectedDataProvider";
import type { WrongQuestion } from "@/lib/database.types";

type QuestionForm = {
  question: string;
  correctAnswer: string;
  explanation: string;
  knowledgePoint: string;
};

const EMPTY_FORM: QuestionForm = {
  question: "",
  correctAnswer: "",
  explanation: "",
  knowledgePoint: "",
};

type SimilarQuestion = {
  question: string;
  correctAnswer: string;
  explanation: string;
};

type StudyResult = {
  explanation?: string;
  similarQuestions?: SimilarQuestion[];
  error?: string;
};

export default function ErrorBookPage() {
  const { wrongQuestions: questions, setWrongQuestions: setQuestions } =
    useProtectedData();
  const [editing, setEditing] = useState<WrongQuestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoading, setIsLoading] = useState(questions === null);
  const [isSaving, setIsSaving] = useState(false);
  const [studyByQuestionId, setStudyByQuestionId] = useState<
    Record<string, StudyResult>
  >({});
  const [activeStudy, setActiveStudy] = useState<{
    id: string;
    action: "explanation" | "similar";
  } | null>(null);

  const loadQuestions = async () => {
    const result = await listWrongQuestions();
    if ("error" in result) setError(result.error);
    else {
      setQuestions(result.data);
      setError("");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (questions !== null) return;

    let active = true;
    void listWrongQuestions()
      .then((result) => {
        if (!active) return;
        if ("error" in result) setError(result.error);
        else setQuestions(result.data);
      })
      .catch(() => {
        if (active) setError("加载错题失败，请检查网络后重试。");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [questions, setQuestions]);

  const refresh = async () => {
    setIsLoading(true);
    await loadQuestions();
  };

  const openNewQuestion = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setWarning("");
    setIsCreating(true);
  };

  const openEditQuestion = (question: WrongQuestion) => {
    setEditing(question);
    setForm({
      question: question.question,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      knowledgePoint: question.knowledge_point,
    });
    setError("");
    setWarning("");
    setIsCreating(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setWarning("");
    try {
      const result = await saveWrongQuestion(editing?.id ?? null, form);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (editing) {
        setStudyByQuestionId((current) => {
          const next = { ...current };
          delete next[editing.id];
          return next;
        });
      }
      setIsCreating(false);
      setNotice(
        result.warning
          ? editing
            ? "错题已更新。"
            : "错题已保存。"
          : editing
            ? "错题已更新，AI 标签已重新生成。"
            : "错题已保存，AI 已添加标签。",
      );
      setWarning(result.warning ?? "");
      await refresh();
    } catch {
      setError("保存错题失败，请检查网络后重试。");
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = async (question: WrongQuestion) => {
    if (!window.confirm("确定删除这道错题吗？已保存的练习记录会保留。")) return;
    setError("");
    try {
      const result = await deleteWrongQuestion(question.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStudyByQuestionId((current) => {
        const next = { ...current };
        delete next[question.id];
        return next;
      });
      setNotice("错题已删除。");
      await refresh();
    } catch {
      setError("删除错题失败，请检查网络后重试。");
    }
  };

  const explainQuestion = async (question: WrongQuestion) => {
    setActiveStudy({ id: question.id, action: "explanation" });
    setStudyByQuestionId((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        explanation: undefined,
        error: undefined,
      },
    }));
    try {
      const result = await explainWrongQuestion(question.id);
      if ("error" in result) {
        setStudyByQuestionId((current) => ({
          ...current,
          [question.id]: { ...current[question.id], error: result.error },
        }));
        return;
      }
      setStudyByQuestionId((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          explanation: result.data.explanation,
        },
      }));
    } catch {
      setStudyByQuestionId((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          error: "AI 讲解失败，请检查网络后重试。",
        },
      }));
    } finally {
      setActiveStudy(null);
    }
  };

  const generateSimilarQuestions = async (question: WrongQuestion) => {
    setActiveStudy({ id: question.id, action: "similar" });
    setStudyByQuestionId((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        similarQuestions: undefined,
        error: undefined,
      },
    }));
    try {
      const result = await generateSimilarWrongQuestions(question.id);
      if ("error" in result) {
        setStudyByQuestionId((current) => ({
          ...current,
          [question.id]: { ...current[question.id], error: result.error },
        }));
        return;
      }
      setStudyByQuestionId((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          similarQuestions: result.data,
        },
      }));
    } catch {
      setStudyByQuestionId((current) => ({
        ...current,
        [question.id]: {
          ...current[question.id],
          error: "生成相似题失败，请检查网络后重试。",
        },
      }));
    } finally {
      setActiveStudy(null);
    }
  };

  const questionList = questions ?? [];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">错题本</h1>
          <p className="mt-1 text-sm text-slate-500">
            录入题目后会尝试由 AI 自动添加标签，也可获取 AI 讲解和知识点相似题。
          </p>
        </div>
        <Button
          type="button"
          onClick={openNewQuestion}
          className="h-auto rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800"
        >
          + 录入错题
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </p>
      )}
      {warning && (
        <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {warning}
        </p>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">已保存的错题</h2>
        {isLoading ? (
          <p className="py-8 text-center text-slate-500">正在加载错题…</p>
        ) : questionList.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            暂无错题。添加题目后，可以在「练习」页面提交和回看作答记录。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {questionList.map((question) => (
              <li
                key={question.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap font-medium text-slate-800">
                    {question.question}
                  </p>
                  {question.knowledge_point && (
                    <p className="mt-2 text-sm text-blue-700">
                      知识点：{question.knowledge_point}
                    </p>
                  )}
                  {(question.tags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500">AI 标签：</span>
                      {(question.tags ?? []).map((tag) => (
                        <span
                          key={`${question.id}-${tag}`}
                          className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {question.correct_answer && (
                    <details className="mt-2 text-sm text-slate-600">
                      <summary className="cursor-pointer">查看正确答案与解析</summary>
                      <p className="mt-2 whitespace-pre-wrap">
                        正确答案：{question.correct_answer}
                      </p>
                      {question.explanation && (
                        <p className="mt-1 whitespace-pre-wrap">
                          解析：{question.explanation}
                        </p>
                      )}
                    </details>
                  )}
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => openEditQuestion(question)}
                    className="h-auto p-0 text-blue-700 hover:bg-transparent hover:text-blue-900 hover:underline"
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => void removeQuestion(question)}
                    className="h-auto gap-1 p-0 text-red-600 hover:bg-transparent hover:text-red-800 hover:underline"
                  >
                    <Trash aria-hidden="true" className="h-4 w-4" />
                    <span>删除</span>
                  </Button>
                </div>
                <div className="w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeStudy !== null}
                      onClick={() => void explainQuestion(question)}
                    >
                      {activeStudy?.id === question.id &&
                      activeStudy.action === "explanation"
                        ? "AI 讲解生成中…"
                        : "AI 讲解"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeStudy !== null || !question.knowledge_point.trim()}
                      onClick={() => void generateSimilarQuestions(question)}
                    >
                      {activeStudy?.id === question.id &&
                      activeStudy.action === "similar"
                        ? "相似题生成中…"
                        : "推送相似题"}
                    </Button>
                    {!question.knowledge_point.trim() && (
                      <span className="text-xs text-slate-500">
                        补充知识点后可生成相似题
                      </span>
                    )}
                  </div>
                  {studyByQuestionId[question.id]?.error && (
                    <p
                      role="alert"
                      className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                      {studyByQuestionId[question.id].error}
                    </p>
                  )}
                  {studyByQuestionId[question.id]?.explanation && (
                    <div
                      role="status"
                      className="mt-3 rounded-xl bg-violet-50 p-4 text-sm text-slate-700"
                    >
                      <h3 className="mb-2 font-semibold text-violet-900">
                        AI 讲解
                      </h3>
                      <p className="whitespace-pre-wrap">
                        {studyByQuestionId[question.id].explanation}
                      </p>
                    </div>
                  )}
                  {studyByQuestionId[question.id]?.similarQuestions && (
                    <div className="mt-3 rounded-xl bg-blue-50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-blue-900">
                        知识点「{question.knowledge_point}」相似题
                      </h3>
                      <p className="mb-3 text-xs text-blue-800">
                        AI 生成内容请结合教材核对。
                      </p>
                      <ol className="space-y-3">
                        {studyByQuestionId[question.id].similarQuestions?.map(
                          (similarQuestion, index) => (
                            <li
                              key={`${question.id}-similar-${index}`}
                              className="rounded-lg bg-white p-3"
                            >
                              <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">
                                {index + 1}. {similarQuestion.question}
                              </p>
                              <details className="mt-2 text-sm text-slate-600">
                                <summary className="cursor-pointer">
                                  查看答案与解析
                                </summary>
                                <p className="mt-2 whitespace-pre-wrap">
                                  正确答案：{similarQuestion.correctAnswer}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap">
                                  解析：{similarQuestion.explanation}
                                </p>
                              </details>
                            </li>
                          ),
                        )}
                      </ol>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isCreating && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsCreating(false)}
        >
          <form
            aria-label={editing ? "编辑错题" : "录入错题"}
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editing ? "编辑错题" : "录入错题"}
            </h2>
            <label className="block text-sm text-slate-700">
              题目内容 <span className="text-red-600">*</span>
              <textarea
                required
                maxLength={10000}
                rows={5}
                value={form.question}
                onChange={(event) =>
                  setForm((current) => ({ ...current, question: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-700">
              正确答案
              <textarea
                maxLength={10000}
                rows={3}
                value={form.correctAnswer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    correctAnswer: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-700">
              解题解析
              <textarea
                maxLength={10000}
                rows={3}
                value={form.explanation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, explanation: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-700">
              知识点
              <input
                maxLength={200}
                value={form.knowledgePoint}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    knowledgePoint: event.target.value,
                  }))
                }
                placeholder="例如：一次函数"
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-slate-900"
              />
            </label>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreating(false)}
                className="h-auto rounded-lg px-4 py-2 text-slate-700"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-auto rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSaving ? "保存中…" : "保存错题"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
