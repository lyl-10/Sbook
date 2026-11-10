"use client";

import { useEffect, useState } from "react";

type FileItem = {
  id: string;
  name: string;
  type: "pdf" | "image";
  url: string;
  createTime: number;
};

export default function HomePage() {
  const [fileList, setFileList] = useState<FileItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("knowledgeFiles");
    if (saved) setFileList(JSON.parse(saved));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-black">🏠 我的知识库</h1>
        <span className="bg-white border border-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm shadow-sm">
          👋 欢迎回来
        </span>
      </div>

      {fileList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-blue-200 text-slate-500">
          <div className="text-5xl mb-4 opacity-60">📭</div>
          还没有知识条目，去「知识库」页面上传吧
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fileList.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-2xl p-6 border border-blue-50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
            >
              <div className="text-3xl mb-3">
                {file.type === "pdf" ? "📄" : "🖼️"}
              </div>
              <h3 className="font-semibold text-slate-800 truncate">{file.name}</h3>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {file.type.toUpperCase()}
                </span>
                <span>{new Date(file.createTime).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}