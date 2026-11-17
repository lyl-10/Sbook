"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const answerImageBucket = "wrong-answer-images";
const maxAnswerImageBytes = 3 * 1024 * 1024;
const allowedAnswerImageTypes = ["image/png", "image/jpeg", "image/webp"];

type QuestionForm = {
  question: string;
  correctAnswer: string;
  correctAnswerImagePath: string | null;
  explanation: string;
  knowledgePoint: string;
};

const EMPTY_FORM: QuestionForm = {
  question: "",
  correctAnswer: "",
  correctAnswerImagePath: null,
  explanation: "",
  knowledgePoint: "",
};

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未设置" : dateTimeFormatter.format(date);
}

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
  const [correctAnswerImageFile, setCorrectAnswerImageFile] = useState<File | null>(null);
  const [answerImageUrls, setAnswerImageUrls] = useState<Record<string, string>>({});
  const [loadingAnswerImagePaths, setLoadingAnswerImagePaths] = useState<
    Record<string, boolean>
  >({});
  const answerImageInputRef = useRef<HTMLInputElement>(null);
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
    setCorrectAnswerImageFile(null);
    if (answerImageInputRef.current) answerImageInputRef.current.value = "";
    setError("");
    setWarning("");
    setIsCreating(true);
  };

  const openEditQuestion = (question: WrongQuestion) => {
    setEditing(question);
    setForm({
      question: question.question,
      correctAnswer: question.correct_answer,
      correctAnswerImagePath: question.correct_answer_image_path,
      explanation: question.explanation,
      knowledgePoint: question.knowledge_point,
    });
    setCorrectAnswerImageFile(null);
    if (answerImageInputRef.current) answerImageInputRef.current.value = "";
    if (question.correct_answer_image_path) {
      void loadAnswerImageUrl(question.correct_answer_image_path);
    }
    setError("");
    setWarning("");
    setIsCreating(true);
  };

  const loadAnswerImageUrl = async (path: string) => {
    if (answerImageUrls[path] || loadingAnswerImagePaths[path]) return;

    setLoadingAnswerImagePaths((current) => ({ ...current, [path]: true }));
    try {
      const { data, error: signedUrlError } = await createSupabaseBrowserClient()
        .storage.from(answerImageBucket)
        .createSignedUrl(path, 60 * 60);
      if (signedUrlError) {
        setError(`读取参考答案图片失败：${signedUrlError.message}`);
        return;
      }
      setAnswerImageUrls((current) => ({ ...current, [path]: data.signedUrl }));
    } catch {
      setError("读取参考答案图片失败，请检查网络后重试。");
    } finally {
      setLoadingAnswerImagePaths((current) => ({ ...current, [path]: false }));
    }
  };

  const removeAnswerImage = async (path: string) => {
    const { error: removeError } = await createSupabaseBrowserClient()
      .storage.from(answerImageBucket)
      .remove([path]);
    return removeError?.message;
  };

  const selectCorrectAnswerImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!allowedAnswerImageTypes.includes(file.type)) {
      setCorrectAnswerImageFile(null);
      setError("参考答案图片仅支持 PNG、JPEG 或 WebP 格式。");
      return;
    }
    if (file.size > maxAnswerImageBytes) {
      setCorrectAnswerImageFile(null);
      setError("参考答案图片不能超过 3 MB。");
      return;
    }
    setError("");
    setCorrectAnswerImageFile(file);
  };

  const clearCorrectAnswerImage = () => {
    setCorrectAnswerImageFile(null);
    setForm((current) => ({ ...current, correctAnswerImagePath: null }));
    if (answerImageInputRef.current) answerImageInputRef.current.value = "";
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setWarning("");
    let uploadedImagePath: string | null = null;
    let saveStarted = false;
    let saveCompleted = false;
    try {
      let correctAnswerImagePath = form.correctAnswerImagePath;
      if (correctAnswerImageFile) {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          setError(`读取账号失败：${userError.message}`);
          return;
        }
        if (!user) {
          setError("登录状态已失效，请重新登录。");
          return;
        }

        const extension =
          correctAnswerImageFile.type === "image/jpeg"
            ? "jpg"
            : correctAnswerImageFile.type.slice("image/".length);
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(answerImageBucket)
          .upload(path, correctAnswerImageFile, {
            contentType: correctAnswerImageFile.type,
            cacheControl: "3600",
          });
        if (uploadError) {
          setError(`上传参考答案图片失败：${uploadError.message}`);
          return;
        }
        uploadedImagePath = path;
        correctAnswerImagePath = path;
      }

      saveStarted = true;
      const result = await saveWrongQuestion(editing?.id ?? null, {
        ...form,
        correctAnswerImagePath,
      });
      if ("error" in result) {
        let cleanupWarning = "";
        if (uploadedImagePath) {
          try {
            const cleanupError = await removeAnswerImage(uploadedImagePath);
            if (cleanupError) cleanupWarning = `临时图片清理失败：${cleanupError}`;
          } catch {
            cleanupWarning = "临时图片清理失败，请稍后在存储空间中检查。";
          }
        }
        setError([result.error, cleanupWarning].filter(Boolean).join(" "));
        return;
      }
      uploadedImagePath = null;
      saveCompleted = true;

      const warnings = [result.warning].filter((value): value is string => Boolean(value));
      const oldImagePath = editing?.correct_answer_image_path;
      if (oldImagePath && oldImagePath !== correctAnswerImagePath) {
        try {
          const cleanupError = await removeAnswerImage(oldImagePath);
          if (cleanupError) {
            warnings.push(`旧参考答案图片清理失败：${cleanupError}`);
          } else {
            setAnswerImageUrls((current) => {
              const next = { ...current };
              delete next[oldImagePath];
              return next;
            });
          }
        } catch {
          warnings.push("旧参考答案图片清理失败，请稍后在存储空间中检查。");
        }
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
        editing
          ? warnings.length > 0
            ? "错题已更新。"
            : "错题已更新，AI 标签已重新生成。"
          : `错题已保存，首次复习安排在 ${formatDateTime(result.data.next_review_at)}。`,
      );
      setWarning(warnings.join(" "));
      setCorrectAnswerImageFile(null);
      if (answerImageInputRef.current) answerImageInputRef.current.value = "";
      await refresh();
    } catch {
      let cleanupWarning = "";
      if (uploadedImagePath && !saveStarted) {
        try {
          const cleanupError = await removeAnswerImage(uploadedImagePath);
          if (cleanupError) cleanupWarning = `临时图片清理失败：${cleanupError}`;
        } catch {
          cleanupWarning = "临时图片清理失败，请稍后在存储空间中检查。";
        }
      }
      setError(
        [
          saveCompleted
            ? "错题已保存，但刷新列表失败，请重新加载页面。"
            : saveStarted
              ? "保存结果尚未确认，请刷新错题本检查后再重试。"
              : "保存错题失败，请检查网络后重试。",
          cleanupWarning,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = async (question: WrongQuestion) => {
    if (!window.confirm("确定删除这道错题吗？已保存的练习记录会保留。")) return;
    setError("");
    setWarning("");
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
      const answerImagePath = question.correct_answer_image_path;
      if (answerImagePath) {
        try {
          const cleanupError = await removeAnswerImage(answerImagePath);
          if (cleanupError) {
            setWarning(`错题已删除，但参考答案图片清理失败：${cleanupError}`);
          } else {
            setAnswerImageUrls((current) => {
              const next = { ...current };
              delete next[answerImagePath];
              return next;
            });
          }
        } catch {
          setWarning("错题已删除，但参考答案图片清理失败，请稍后在存储空间中检查。");
        }
      }
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
            可添加文字或图片参考答案，练习时由 AI 结合参考答案判断；题目会尝试自动添加标签，也可获取 AI 讲解和相似题。
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
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>录入时间：{formatDateTime(question.created_at)}</span>
                    <span>
                      下次复习：{formatDateTime(question.next_review_at)}
                    </span>
                    <span>已复习 {question.review_count} 次</span>
                  </p>
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
                  {(question.correct_answer ||
                    question.correct_answer_image_path ||
                    question.explanation) && (
                    <details
                      className="mt-2 text-sm text-slate-600"
                      onToggle={(event) => {
                        if (
                          event.currentTarget.open &&
                          question.correct_answer_image_path
                        ) {
                          void loadAnswerImageUrl(
                            question.correct_answer_image_path,
                          );
                        }
                      }}
                    >
                      <summary className="cursor-pointer">查看参考答案与解析</summary>
                      {question.correct_answer && (
                        <p className="mt-2 whitespace-pre-wrap">
                          正确答案：{question.correct_answer}
                        </p>
                      )}
                      {question.correct_answer_image_path && (
                        <div className="mt-2">
                          <p>参考答案图片：</p>
                          {answerImageUrls[question.correct_answer_image_path] ? (
                            <Image
                              src={answerImageUrls[question.correct_answer_image_path]}
                              alt="参考答案"
                              width={720}
                              height={480}
                              unoptimized
                              className="mt-2 h-auto max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                            />
                          ) : (
                            <p className="mt-1 text-xs text-slate-500">
                              {loadingAnswerImagePaths[
                                question.correct_answer_image_path
                              ]
                                ? "正在加载参考答案图片…"
                                : "参考答案图片暂不可用，请稍后重试。"}
                            </p>
                          )}
                        </div>
                      )}
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
            <div className="space-y-2 text-sm text-slate-700">
              <p>参考答案图片（可选）</p>
              <input
                ref={answerImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={selectCorrectAnswerImage}
                aria-label="上传参考答案图片"
                className="sr-only"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => answerImageInputRef.current?.click()}
                  className="h-auto rounded-lg px-4 py-2 text-slate-700"
                >
                  {correctAnswerImageFile || form.correctAnswerImagePath
                    ? "更换参考答案图片"
                    : "上传参考答案图片"}
                </Button>
                {correctAnswerImageFile && (
                  <span className="max-w-64 truncate text-slate-600">
                    {correctAnswerImageFile.name}
                  </span>
                )}
                {!correctAnswerImageFile &&
                  form.correctAnswerImagePath &&
                  (answerImageUrls[form.correctAnswerImagePath] ? (
                    <Image
                      src={answerImageUrls[form.correctAnswerImagePath]}
                      alt="当前参考答案"
                      width={320}
                      height={200}
                      unoptimized
                      className="h-auto max-h-40 max-w-48 rounded-lg border border-slate-200 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">
                      {loadingAnswerImagePaths[form.correctAnswerImagePath]
                        ? "正在加载图片…"
                        : "已保存参考答案图片"}
                    </span>
                  ))}
                {(correctAnswerImageFile || form.correctAnswerImagePath) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearCorrectAnswerImage}
                    className="h-auto p-1 text-red-600 hover:bg-transparent hover:text-red-800"
                  >
                    移除图片
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                支持 PNG、JPEG、WebP，最大 3 MB。图片会保存为私有文件，并在练习时提供给 AI 判题。
              </p>
            </div>
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
