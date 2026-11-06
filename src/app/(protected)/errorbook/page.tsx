"use client";

import { useState, useRef, useEffect } from "react";

type ErrorItem = {
  id: number;
  title: string;
  knowledge: string;
};

export default function ErrorBookPage() {
  // 1. 初始状态改为空数组
  const [errorList, setErrorList] = useState<ErrorItem[]>([]);
  const [previewItem, setPreviewItem] = useState<ErrorItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // 新增：防止初始化时覆盖本地新数据的标志
  const [isInitialized, setIsInitialized] = useState(false);

  // 2. 初始化：从 localStorage 读取
  useEffect(() => {
    if (isInitialized) return;
    
    const saved = localStorage.getItem("errorBookList");
    if (saved) {
      try {
        setErrorList(JSON.parse(saved));
      } catch (e) {
        console.error("解析错题列表失败", e);
      }
    } else {
      // 如果本地没有任何数据，给一个初始的测试数据
      setErrorList([{ id: 1, title: "模拟识别出来的错题", knowledge: "知识点：xxxx" }]);
    }
    setIsInitialized(true);
  }, [isInitialized]);

  // 3. 持久化：errorList 变化时写入 localStorage
  useEffect(() => {
    // 只有在初始化完成后才写入，避免把空数组覆盖了原本的数据
    if (isInitialized) {
      localStorage.setItem("errorBookList", JSON.stringify(errorList));
    }
  }, [errorList, isInitialized]);

  // 处理文件上传（模拟识别）
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newError: ErrorItem = {
      id: Date.now(),
      title: `模拟识别出来的错题 (${files[0].name})`,
      knowledge: "知识点：数学 / 函数",
    };

    setErrorList((prev) => [newError, ...prev]);
    
    if (fileRef.current) fileRef.current.value = "";
  };

  // 删除错题
  const deleteError = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这道错题吗？")) {
      setErrorList((prev) => prev.filter((item) => item.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">错题模块</h2>

      {/* 上传区域 */}
      <div className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center bg-white mb-6">
        <p className="text-slate-500 mb-4">上传试卷截图、错题照片自动识别</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg transition active:scale-95"
        >
          上传错题图片
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.png,.jpeg"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* 错题列表区域 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-black mb-4">错题列表</h3>

        {errorList.length === 0 ? (
          <p className="text-slate-500">暂无错题，上传图片自动识别加入错题本</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {errorList.map((item) => (
              <li
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="py-4 flex justify-between items-center group cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition"
              >
                <div>
                  <p className="text-slate-800 font-medium mb-1">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.knowledge}</p>
                </div>

                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewItem(item);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 rounded-md transition"
                  >
                    预览
                  </button>
                  <button
                    onClick={(e) => deleteError(item.id, e)}
                    className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-md font-medium transition"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 错题预览弹层 */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-black">错题详情</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-black text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">题目/错题内容</p>
                <p className="text-slate-800">{previewItem.title}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">关联知识点</p>
                <p className="text-slate-800">{previewItem.knowledge}</p>
              </div>
            </div>

            <button
              onClick={() => setPreviewItem(null)}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"
            >
              关闭预览
            </button>
          </div>
        </div>
      )}
    </div>
  );
}