"use client";

import { useState, useRef, useEffect } from "react";

// 扩展了 "other" 类型以支持所有文件
type FileItem = {
  id: string;
  name: string;
  type: "pdf" | "image" | "other";
  url: string;
  createTime: number;
};

export default function KnowledgePage() {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const saved = localStorage.getItem("knowledgeFiles");
    if (saved) {
      try {
        setFileList(JSON.parse(saved));
      } catch (e) {
        console.error("解析本地文件列表失败", e);
      }
    }
  }, []);

  // 持久化：fileList 变化时写入 localStorage
  useEffect(() => {
    localStorage.setItem("knowledgeFiles", JSON.stringify(fileList));
  }, [fileList]);

  // 触发文件选择
  const handleUpload = () => {
    inputRef.current?.click();
  };

  // 选择文件后处理（取消类型限制，所有文件均可上传）
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      const fileType = isPdf ? "pdf" : isImage ? "image" : "other";

      const url = URL.createObjectURL(file);
      const newItem: FileItem = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: fileType,
        url,
        createTime: Date.now(),
      };
      setFileList((prev) => [newItem, ...prev]);
    }

    // 清空 input，允许重复选择同一文件
    if (inputRef.current) inputRef.current.value = "";
  };

  // 删除文件
  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发卡片点击预览
    if (confirm("确定要删除这个文件吗？")) {
      setFileList((prev) => prev.filter((f) => f.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    }
  };

  return (
    <div>
      {/* 顶部标题和上传按钮 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-black">📚 个人知识库</h1>
        <button
          onClick={handleUpload}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition active:scale-[0.98]"
        >
          + 上传文件
        </button>
        {/* 去掉了 accept 属性，允许上传任何文件 */}
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* 文件列表或空状态 */}
      {fileList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-blue-200 text-slate-500">
          <div className="text-5xl mb-4 opacity-60">📭</div>
          还没有文件，点击右上角「上传文件」添加文件吧
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {fileList.map((file) => (
            <div
              key={file.id}
              onClick={() => setPreviewItem(file)}
              className="bg-white rounded-2xl p-5 border border-blue-50 shadow-sm hover:shadow-lg transition group cursor-pointer relative"
            >
              {/* 预览区：根据类型显示不同图标 */}
              <div className="h-36 mb-4 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                {file.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : file.type === "pdf" ? (
                  <div className="text-center">
                    <div className="text-5xl mb-1">📄</div>
                    <span className="text-xs text-slate-400">点击预览 PDF</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-1">📦</div>
                    <span className="text-xs text-slate-400">点击查看/下载</span>
                  </div>
                )}
              </div>

              {/* 文件名 */}
              <h3 className="font-semibold text-slate-800 truncate mb-1" title={file.name}>
                {file.name}
              </h3>

              {/* 底部信息与操作区 */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {file.type === "other" ? "FILE" : file.type.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span>{new Date(file.createTime).toLocaleDateString()}</span>
                  
                  {/* 修改为高亮红色的删除按钮 */}
                  <button
                    onClick={(e) => deleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-all font-medium"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 预览弹层 */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 truncate">{previewItem.name}</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none px-2"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
              {previewItem.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-[75vh] object-contain" />
              ) : previewItem.type === "pdf" ? (
                <iframe src={previewItem.url} title={previewItem.name} className="w-full h-[75vh] rounded-lg" />
              ) : (
                // 其他文件类型的预览提示与下载按钮
                <div className="text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-slate-600 mb-6">当前文件格式暂不支持网页直接预览</p>
                  <a
                    href={previewItem.url}
                    download={previewItem.name}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition"
                  >
                    下载到本地查看
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}