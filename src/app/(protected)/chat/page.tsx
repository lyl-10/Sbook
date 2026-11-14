"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  useChatMessages,
  type ChatCitation,
} from "@/components/ChatMessagesProvider";

const maxChatImageBytes = 3 * 1024 * 1024;

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("读取 PNG 图片失败。"));
      }
    };
    reader.onerror = () => reject(new Error("读取 PNG 图片失败。"));
    reader.readAsDataURL(file);
  });
}

function isCitation(value: unknown): value is ChatCitation {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "excerpt" in value &&
    typeof value.excerpt === "string"
  );
}

const suggestions = [
  "帮我总结资料中的重点",
  "解释资料里的核心概念",
  "根据资料列出复习提纲",
];

export default function ChatPage() {
  const { messages, setMessages } = useChatMessages();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(
    () => () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage.preview);
    },
    [selectedImage],
  );

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedQuestion = question.trim();
    const imageToSend = selectedImage;
    if ((!submittedQuestion && !imageToSend) || isSending) return;

    setError("");
    setIsSending(true);

    try {
      const imageDataUrl = imageToSend
        ? await readImageAsDataUrl(imageToSend.file)
        : undefined;
      const userMessage = submittedQuestion || "请识别并描述这张图片。";
      setQuestion("");
      setSelectedImage(null);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: userMessage,
          ...(imageDataUrl ? { image: imageDataUrl } : {}),
        },
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: submittedQuestion,
          image: imageDataUrl,
        }),
      });
      const result = (await response.json()) as {
        answer?: unknown;
        citations?: unknown;
        error?: unknown;
      };
      const answer = result.answer;
      const citations = result.citations;

      if (!response.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "问答请求失败，请稍后重试。",
        );
        return;
      }
      if (
        typeof answer !== "string" ||
        !Array.isArray(citations) ||
        !citations.every(isCitation)
      ) {
        setError("AI 服务返回了无法识别的响应，请稍后重试。");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          citations,
        },
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === "读取 PNG 图片失败。"
          ? reason.message
          : "问答请求失败，请检查网络后重试。",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100dvh-4rem)] min-h-[560px] max-w-5xl flex-col">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-700 text-xl text-white shadow-sm">
            ✦
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">知识库助手</h1>
            <p className="mt-0.5 text-sm text-slate-500">基于个人资料的 AI 学习伙伴</p>
          </div>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => setMessages([])}
          disabled={messages.length === 0 || isSending}
          className="h-auto rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          清空对话
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-7">
          <span className="size-2 rounded-full bg-emerald-500" />
          仅根据你上传的资料回答，并附上可核对的来源
        </div>

        <div
          ref={chatBoxRef}
          role="log"
          aria-live="polite"
          className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-7"
        >
          {messages.length === 0 && (
            <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl">
                📖
              </div>
              <h2 className="text-xl font-semibold text-slate-900">让你的资料，变成答案</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                提问、附加 PNG 图片或选择一个示例开始。回答会优先依据你的知识库，并提供原文引用。
              </p>
              <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    variant="outline"
                    key={suggestion}
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    className="h-auto rounded-full border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm text-blue-800">
                  ✦
                </div>
              )}
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[78%] sm:px-5 ${
                  message.role === "user"
                    ? "rounded-br-md bg-blue-700 text-white"
                    : "rounded-bl-md border border-slate-100 bg-slate-50 text-slate-800"
                }`}
              >
                {message.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.image}
                    alt="附加的 PNG 图片"
                    className="mb-2 max-h-64 max-w-full rounded-lg object-contain"
                  />
                )}
                {message.role === "assistant" ? (
                  <div className="break-words [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
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
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                {message.citations && message.citations.length > 0 && (
                  <details className="mt-4 border-t border-slate-200 pt-3">
                    <summary className="cursor-pointer text-xs font-semibold tracking-wide text-slate-500 hover:text-blue-700">
                      参考资料（{message.citations.length}）
                    </summary>
                    <div className="mt-3 space-y-2">
                      {message.citations.map((citation, index) => (
                        <figure key={citation.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <figcaption className="flex items-center justify-between gap-3 text-xs font-medium text-slate-700">
                            <span className="min-w-0 truncate">
                              <span className="mr-2 text-blue-700">[{index + 1}]</span>
                              {citation.title}
                            </span>
                            <a
                              href={`/api/documents/${citation.id}/download`}
                              className="shrink-0 text-blue-700 hover:underline"
                            >
                              查看
                            </a>
                          </figcaption>
                          <blockquote className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                            {citation.excerpt}
                          </blockquote>
                        </figure>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </article>
          ))}
          {isSending && (
            <div role="status" className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                ✦
              </div>
              <span className="animate-pulse">正在检索资料并整理回答…</span>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mx-4 mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:mx-7">
            {error}
          </p>
        )}

        <form
          onSubmit={sendMessage}
          className="border-t border-slate-100 bg-white p-4 sm:px-7 sm:py-5"
        >
          {selectedImage && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage.preview}
                alt="待发送的 PNG 图片"
                className="size-14 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                {selectedImage.file.name}
              </span>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setSelectedImage(null)}
                disabled={isSending}
                aria-label="移除图片"
                className="h-auto rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-50"
              >
                移除
              </Button>
            </div>
          )}
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              maxLength={1000}
              placeholder="输入你想了解的内容…"
              aria-label="输入问题"
              className="max-h-36 min-h-12 min-w-0 flex-1 resize-y bg-transparent px-3 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
              rows={1}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.type !== "image/png") {
                  setError("请选择 PNG 图片。");
                  return;
                }
                if (file.size > maxChatImageBytes) {
                  setError("PNG 图片不能超过 3 MB。");
                  return;
                }
                setError("");
                setSelectedImage({
                  file,
                  preview: URL.createObjectURL(file),
                });
              }}
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSending}
              aria-label="附加 PNG 图片"
              className="h-10 shrink-0 rounded-xl border-slate-200 bg-white px-3 text-sm text-slate-600 hover:border-blue-300 hover:bg-white hover:text-blue-700 disabled:opacity-50"
            >
              + PNG
            </Button>
            <Button
              type="submit"
              disabled={(!question.trim() && !selectedImage) || isSending}
              aria-label="发送问题"
              className="size-10 shrink-0 rounded-xl bg-blue-700 p-0 text-lg text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-100"
            >
              ↑
            </Button>
          </div>
          <div className="mt-2 flex justify-between px-1 text-xs text-slate-400">
            <span>PNG 最大 3 MB · Enter 发送 · Shift + Enter 换行</span>
            <span>{question.length}/1000</span>
          </div>
        </form>
      </div>
    </section>
  );
}
