"use client";

import { useEffect, useState } from "react";
import {
  deleteWrongQuestion,
  listWrongQuestions,
  saveWrongQuestion,
} from "@/app/actions";
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

export default function ErrorBookPage() {
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [editing, setEditing] = useState<WrongQuestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    await loadQuestions();
  };

  const openNewQuestion = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
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
    setIsCreating(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const result = await saveWrongQuestion(editing?.id ?? null, form);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setIsCreating(false);
      setNotice(editing ? "错题已更新。" : "错题已保存。");
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
      setNotice("错题已删除。");
      await refresh();
    } catch {
      setError("删除错题失败，请检查网络后重试。");
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">错题本</h1>
          <p className="mt-1 text-sm text-slate-500">
            手动记录题目、正确答案、解析和知识点；自动 OCR 暂不包含在 MVP。
          </p>
        </div>
        <button
          type="button"
          onClick={openNewQuestion}
          className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800"
        >
          + 录入错题
        </button>
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

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">已保存的错题</h2>
        {isLoading ? (
          <p className="py-8 text-center text-slate-500">正在加载错题…</p>
        ) : questions.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            暂无错题。添加题目后，可以在「练习」页面提交和回看作答记录。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {questions.map((question) => (
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
                  <button
                    type="button"
                    onClick={() => openEditQuestion(question)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeQuestion(question)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
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
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg border px-4 py-2 text-slate-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
              >
                {isSaving ? "保存中…" : "保存错题"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
