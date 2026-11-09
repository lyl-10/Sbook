"use client";

import { useEffect, useRef, useState } from "react";
import { askKnowledgeQuestion } from "@/app/actions";

type Citation = { id: string; title: string; excerpt: string };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBoxRef.current?.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedQuestion = question.trim();
    if (!submittedQuestion || isSending) return;

    setError("");
    setQuestion("");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: submittedQuestion,
      },
    ]);
    setIsSending(true);
    try {
      const result = await askKnowledgeQuestion(submittedQuestion);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.data.answer,
          citations: result.data.citations,
        },
      ]);
    } catch {
      setError("问答请求失败，请检查网络后重试。");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">知识库问答</h1>
        <p className="mt-1 text-sm text-slate-500">
          回答基于你上传的 PDF、TXT 和 Markdown 内容，并附上可核对的资料片段。
        </p>
      </div>

      <div className="flex h-[min(75vh,800px)] min-h-[420px] flex-col rounded-2xl bg-white shadow-sm">
        <div ref={chatBoxRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-slate-500">
              <p>
                询问已上传资料中的内容。
                <br />
                没有相关资料时，系统会明确告知，不会编造答案。
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 sm:max-w-[80%] ${
                  message.role === "user"
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-slate-300 pt-3">
                    <h2 className="text-sm font-semibold">资料来源</h2>
                    {message.citations.map((citation, index) => (
                      <figure key={citation.id} className="rounded-lg bg-white/70 p-3">
                        <figcaption className="text-xs font-medium text-blue-800">
                          [{index + 1}] {citation.title}
                          <a
                            href={`/api/documents/${citation.id}/download`}
                            className="ml-2 underline"
                          >
                            打开资料
                          </a>
                        </figcaption>
                        <blockquote className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                          {citation.excerpt}
                        </blockquote>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          {isSending && (
            <p role="status" className="text-sm text-slate-500">
              正在检索你的资料…
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mx-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
            {error}
          </p>
        )}

        <form
          onSubmit={sendMessage}
          className="flex gap-3 border-t border-slate-100 p-4 sm:p-6"
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={1000}
            placeholder="输入一个关于已上传资料的问题"
            className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={!question.trim() || isSending}
            className="self-end rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "检索中…" : "发送"}
          </button>
        </form>
      </div>
    </section>
  );
}
