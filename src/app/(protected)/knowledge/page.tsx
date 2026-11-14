"use client";

import { useEffect, useRef, useState } from "react";
import { listKnowledgeDocuments, updateKnowledgeMetadata } from "@/app/actions";
import type { KnowledgeDocument } from "@/lib/database.types";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<KnowledgeDocument | null>(null);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const result = await listKnowledgeDocuments();
    if ("error" in result) setError(result.error);
    else {
      setDocuments(result.data);
      setError("");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let active = true;
    void listKnowledgeDocuments()
      .then((result) => {
        if (!active) return;
        if ("error" in result) setError(result.error);
        else setDocuments(result.data);
      })
      .catch(() => {
        if (active) setError("加载知识库失败，请检查网络后重试。");
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
    await loadDocuments();
  };

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError("");
    setNotice("");
    setIsUploading(true);
    let uploadError = "";
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("category", category);
        formData.set("tags", tags);
        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "文件上传失败。";
          uploadError = `${file.name}：${message}`;
          break;
        }
      }
      await refresh();
      if (uploadError) setError(uploadError);
      else setNotice("资料已安全保存到你的知识库。");
    } catch {
      setError("上传请求失败，请检查网络后重试。");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (document: KnowledgeDocument) => {
    if (!window.confirm(`确定删除「${document.title}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "删除资料失败。";
        setError(message);
        return;
      }
      if (preview?.id === document.id) setPreview(null);
      await refresh();
      setNotice("资料已删除。");
    } catch {
      setError("删除资料失败，请检查网络后重试。");
    }
  };

  const saveMetadata = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    setError("");
    try {
      const result = await updateKnowledgeMetadata(
        editing.id,
        editCategory,
        editTags,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setNotice("分类和标签已更新。");
      await refresh();
    } catch {
      setError("更新资料信息失败，请检查网络后重试。");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleDocuments = documents.filter((document) => {
    const searchable = [
      document.title,
      document.category,
      ...document.tags,
    ].join(" ").toLocaleLowerCase();
    return searchable.includes(search.trim().toLocaleLowerCase());
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">个人知识库</h1>
          <p className="mt-1 text-sm text-slate-500">
            PDF、TXT、Markdown 和 PNG；单文件最多 10 MB。知识库中的 PNG 暂不自动识别文字，可在聊天中附加 PNG 让 AI 识图。
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {isUploading ? "正在上传…" : "+ 上传资料"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,.png,application/pdf,text/plain,text/markdown,image/png"
          multiple
          onChange={uploadFiles}
          className="hidden"
        />
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm text-slate-600">
          上传分类
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={50}
            placeholder="例如：数学"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          上传标签（逗号分隔）
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={500}
            placeholder="例如：函数,复习"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          搜索资料
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="按名称、分类或标签搜索"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>
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

      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
          正在加载资料…
        </p>
      ) : visibleDocuments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-12 text-center text-slate-500">
          <div className="mb-4 text-5xl">📭</div>
          {documents.length === 0
            ? "还没有资料。上传 PDF、TXT、Markdown 或 PNG 文件开始建立知识库。"
            : "没有找到匹配的资料。"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDocuments.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-blue-50 bg-white p-5 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setPreview(document)}
                className="block w-full text-left"
              >
                <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-slate-50 text-4xl">
                  {document.mime_type === "application/pdf"
                    ? "📄"
                    : document.mime_type === "image/png"
                      ? "🖼️"
                      : "📝"}
                </div>
                <h2 className="truncate font-semibold text-slate-800" title={document.title}>
                  {document.title}
                </h2>
              </button>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                  {document.category || "未分类"}
                </span>
                {document.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2 py-1 text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
                <span>{(document.size_bytes / 1024).toFixed(0)} KB</span>
              </div>
              <div className="mt-3 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(document);
                    setEditCategory(document.category);
                    setEditTags(document.tags.join(", "));
                    setError("");
                  }}
                  className="text-blue-700 hover:text-blue-900"
                >
                  分类/标签
                </button>
                <a
                  href={`/api/documents/${document.id}/download`}
                  className="text-blue-700 hover:text-blue-900"
                >
                  下载
                </a>
                <button
                  type="button"
                  onClick={() => void deleteDocument(document)}
                  className="text-red-600 hover:text-red-800"
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {preview && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
            className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="truncate font-semibold text-slate-800">{preview.title}</h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="关闭预览"
                className="px-2 text-xl text-slate-500"
              >
                ×
              </button>
            </div>
            {preview.mime_type === "image/png" ? (
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${preview.id}/download`}
                  alt={preview.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <iframe
                title={preview.title}
                src={`/api/documents/${preview.id}/download`}
                className="min-h-0 flex-1 bg-slate-50"
              />
            )}
          </div>
        </div>
      )}

      {editing && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            aria-label="编辑资料分类和标签"
            onSubmit={saveMetadata}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900">编辑资料信息</h2>
            <label className="block text-sm text-slate-600">
              分类
              <input
                value={editCategory}
                onChange={(event) => setEditCategory(event.target.value)}
                maxLength={50}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-600">
              标签（逗号分隔，最多 10 个）
              <input
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border px-4 py-2 text-slate-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
              >
                {isSaving ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
