"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash, ZoomIn, ZoomOut } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listKnowledgeDocuments, updateKnowledgeMetadata } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useProtectedData } from "@/components/ProtectedDataProvider";
import type { KnowledgeDocument } from "@/lib/database.types";

export default function KnowledgePage() {
  const { knowledgeDocuments: documents, setKnowledgeDocuments: setDocuments } =
    useProtectedData();
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [preview, setPreview] = useState<KnowledgeDocument | null>(null);
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const [useOriginalPreviewImage, setUseOriginalPreviewImage] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [isDraggingPreviewImage, setIsDraggingPreviewImage] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoading, setIsLoading] = useState(documents === null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageViewportRef = useRef<HTMLDivElement>(null);
  const imageDragRef = useRef<{
    pointerId: number;
    startY: number;
    startOffsetY: number;
  } | null>(null);

  const changeImageZoom = (change: number) => {
    setImageZoom((zoom) => Math.min(3, Math.max(0.5, zoom + change)));
    setImageOffsetY(0);
  };

  const startImageDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    if (imageZoom <= 1 || isPreviewImageLoading) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    imageDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffsetY: imageOffsetY,
    };
    setIsDraggingPreviewImage(true);
  };

  const movePreviewImage = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = imageDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const viewportHeight = imageViewportRef.current?.clientHeight ?? 0;
    const maxOffset = Math.max(
      0,
      (event.currentTarget.offsetHeight * imageZoom - viewportHeight) / 2,
    );
    const offset = drag.startOffsetY + event.clientY - drag.startY;
    setImageOffsetY(Math.min(maxOffset, Math.max(-maxOffset, offset)));
  };

  const stopPreviewImageDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    if (imageDragRef.current?.pointerId !== event.pointerId) return;
    imageDragRef.current = null;
    setIsDraggingPreviewImage(false);
  };

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
    if (documents !== null) return;

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
  }, [documents, setDocuments]);

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
    setWarning("");
    setIsUploading(true);
    let uploadError = "";
    const uploadWarnings: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("category", category);
        formData.set("tags", tags);
        let response: Response;
        try {
          response = await fetch("/api/documents", {
            method: "POST",
            body: formData,
          });
        } catch {
          uploadError = `${file.name}：无法连接上传服务，请检查网络后重试。`;
          break;
        }

        let result: unknown;
        try {
          result = await response.json();
        } catch {
          uploadError = `${file.name}：上传服务返回了无法识别的响应（HTTP ${response.status}）。`;
          break;
        }

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
        if (
          typeof result === "object" &&
          result !== null &&
          "warning" in result &&
          typeof result.warning === "string"
        ) {
          uploadWarnings.push(`${file.name}：${result.warning}`);
        }
      }
      await refresh();
      if (uploadError) setError(uploadError);
      else setNotice("资料已安全保存，AI 标签已自动添加。");
      if (uploadWarnings.length > 0) {
        const displayedWarnings = uploadWarnings.slice(0, 3).join("；");
        const remainingCount = uploadWarnings.length - 3;
        setWarning(
          remainingCount > 0
            ? `${displayedWarnings}；另有 ${remainingCount} 个文件未能自动添加标签。`
            : displayedWarnings,
        );
      }
    } catch {
      setError("处理上传结果时发生错误，请刷新页面后重试。");
    } finally {
      setIsUploading(false);
      setIsUploadFormOpen(false);
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

  const documentList = documents ?? [];
  const existingCategories = Array.from(
    new Set(
      documentList
        .map((document) => document.category.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const visibleDocuments = documentList.filter((document) => {
    const searchable = [
      document.title,
      document.category,
      ...document.tags,
    ].join(" ").toLocaleLowerCase();
    return (
      (!selectedCategory || document.category === selectedCategory) &&
      searchable.includes(search.trim().toLocaleLowerCase())
    );
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">个人知识库</h1>
          <p className="mt-1 text-sm text-slate-500">
            上传后会尝试由 AI 自动添加标签。正文或不超过 3 MB 的 PNG 图片会发送给已配置的 AI 服务；PNG 不执行 OCR。单文件最多 10 MB。
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setError("");
            setNotice("");
            setWarning("");
            setIsUploadFormOpen(true);
          }}
          disabled={isUploading}
          className="h-auto rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          + 上传资料
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,.png,application/pdf,text/plain,text/markdown,image/png"
          multiple
          onChange={uploadFiles}
          className="hidden"
        />
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-4">
        <label className="block text-sm text-slate-600">
          搜索资料
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="按名称、分类或标签搜索"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="mt-4">
          <p className="mb-2 text-sm text-slate-600">按已有分类快捷筛选</p>
          {existingCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={selectedCategory === ""}
                onClick={() => setSelectedCategory("")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  selectedCategory === ""
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                全部
              </button>
              {existingCategories.map((existingCategory) => (
                <button
                  key={existingCategory}
                  type="button"
                  aria-pressed={selectedCategory === existingCategory}
                  onClick={() =>
                    setSelectedCategory((current) =>
                      current === existingCategory ? "" : existingCategory,
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    selectedCategory === existingCategory
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {existingCategory}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">暂无已有分类，上传资料并设置分类后会显示在这里。</p>
          )}
        </div>
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

      {isUploadFormOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!isUploading) setIsUploadFormOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-dialog-title"
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 id="upload-dialog-title" className="text-lg font-semibold text-slate-900">
                上传资料
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                设置分类和标签后选择文件；AI 仍会尝试补充标签。
              </p>
            </div>
            <label className="block text-sm text-slate-600">
              上传分类
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={50}
                placeholder="例如：数学"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-600">
              上传标签（逗号分隔）
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                maxLength={500}
                placeholder="例如：函数,复习"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                disabled={isUploading}
                onClick={() => setIsUploadFormOpen(false)}
                className="h-auto rounded-lg px-4 py-2 text-slate-700"
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
                className="h-auto rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isUploading ? "正在上传…" : "选择文件并上传"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
          正在加载资料…
        </p>
      ) : visibleDocuments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-12 text-center text-slate-500">
          <div className="mb-4 text-5xl">📭</div>
          {documentList.length === 0
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
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setPreview(document);
                  setIsPreviewImageLoading(document.mime_type === "image/png");
                  setPreviewImageFailed(false);
                  setUseOriginalPreviewImage(false);
                  setImageZoom(1);
                  setImageOffsetY(0);
                  setIsDraggingPreviewImage(false);
                  imageDragRef.current = null;
                }}
                className="h-auto w-full flex-col items-stretch justify-start rounded-lg p-0 text-left text-slate-800 hover:bg-slate-50"
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
              </Button>
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
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setEditing(document);
                    setEditCategory(document.category);
                    setEditTags(document.tags.join(", "));
                    setError("");
                  }}
                  className="h-auto p-0 text-blue-700 hover:bg-transparent hover:text-blue-900 hover:underline"
                >
                  分类/标签
                </Button>
                <a
                  href={`/api/documents/${document.id}/download`}
                  className="text-blue-700 hover:text-blue-900"
                >
                  下载
                </a>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => void deleteDocument(document)}
                  className="h-auto gap-1 p-0 text-red-600 hover:bg-transparent hover:text-red-800 hover:underline"
                >
                  <Trash aria-hidden="true" className="h-4 w-4" />
                  <span>删除</span>
                </Button>
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
              <Button
                variant="ghost"
                type="button"
                onClick={() => setPreview(null)}
                aria-label="关闭预览"
                className="h-auto px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </Button>
            </div>
            {preview.mime_type === "image/png" ? (
              <div
                className="relative min-h-0 flex-1 bg-slate-50"
                aria-busy={isPreviewImageLoading}
              >
                <div
                  ref={imageViewportRef}
                  className="flex h-full w-full items-center justify-center overflow-auto p-4"
                >
                  {isPreviewImageLoading && (
                    <p role="status" className="text-sm text-slate-500">
                      正在加载图片预览…
                    </p>
                  )}
                  {previewImageFailed ? (
                    <p role="alert" className="text-sm text-red-600">
                      图片加载失败，请关闭后重试。
                    </p>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/documents/${preview.id}/download${useOriginalPreviewImage ? "" : "?preview=1"}`}
                      alt={preview.title}
                      fetchPriority="high"
                      decoding="async"
                      draggable={false}
                      onLoad={() => setIsPreviewImageLoading(false)}
                      onError={() => {
                        if (!useOriginalPreviewImage) {
                          setUseOriginalPreviewImage(true);
                        } else {
                          setIsPreviewImageLoading(false);
                          setPreviewImageFailed(true);
                        }
                      }}
                      onPointerDown={startImageDrag}
                      onPointerMove={movePreviewImage}
                      onPointerUp={stopPreviewImageDrag}
                      onPointerCancel={stopPreviewImageDrag}
                      className={`max-h-full max-w-full select-none object-contain ${
                        imageZoom > 1
                          ? isDraggingPreviewImage
                            ? "cursor-grabbing"
                            : "cursor-grab"
                          : ""
                      }`}
                      style={{
                        transform: `translateY(${imageOffsetY}px) scale(${imageZoom})`,
                        transformOrigin: "center center",
                        touchAction: imageZoom > 1 ? "none" : "auto",
                        transition: isDraggingPreviewImage
                          ? "none"
                          : "transform 150ms ease",
                      }}
                    />
                  )}
                </div>
                {!previewImageFailed && (
                  <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-md">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => changeImageZoom(-0.25)}
                      disabled={imageZoom <= 0.5}
                      aria-label="缩小图片"
                      className="h-9 w-9 p-0"
                    >
                      <ZoomOut aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <span className="min-w-12 text-center text-xs text-slate-600">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => changeImageZoom(0.25)}
                      disabled={imageZoom >= 3}
                      aria-label="放大图片"
                      className="h-9 w-9 p-0"
                    >
                      <ZoomIn aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setImageZoom(1);
                        setImageOffsetY(0);
                      }}
                      disabled={imageZoom === 1}
                      aria-label="重置图片大小"
                      className="h-9 w-9 p-0"
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : preview.mime_type === "text/markdown" ? (
              <article className="min-h-0 flex-1 overflow-auto break-words bg-white p-6 text-slate-800 [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
                {preview.extracted_text ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ alt }) => (
                        <span className="text-slate-500">
                          {alt ? `[图片：${alt}]` : "[图片]"}
                        </span>
                      ),
                    }}
                  >
                    {preview.extracted_text}
                  </ReactMarkdown>
                ) : (
                  <p className="text-slate-500">此资料暂无可预览的文本内容。</p>
                )}
              </article>
            ) : preview.mime_type === "text/plain" ? (
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-white p-6 font-sans text-slate-800">
                {preview.extracted_text || "此资料暂无可预览的文本内容。"}
              </pre>
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
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditing(null)}
                className="h-auto rounded-lg px-4 py-2 text-slate-700"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-auto rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isSaving ? "保存中…" : "保存"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
