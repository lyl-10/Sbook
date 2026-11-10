"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEST_USER = {
  username: "admin", // 注意：你截图里的提示是 admin，请确保测试账号是 admin
  password: "123456", // 如果你的密码不是这个，请修改这里
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("请输入账号和密码");
      return;
    }

    // 校验测试用户
    if (username !== TEST_USER.username || password !== TEST_USER.password) {
      setError("用户名或密码错误");
      return;
    }

    // 登录成功：写入 localStorage
    localStorage.setItem("knowledge-logged-in", "true");
    localStorage.setItem("knowledge-user", username);
    
    // 强制刷新并跳转到首页（使用 window.location.href 确保状态刷新）
    window.location.href = "/"; 
  };

  return (
    // 修改 1：背景改成浅蓝色（bg-blue-100）
    <div className="min-h-screen flex items-center justify-center bg-blue-100 px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-8">
          个人知识库登录
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-700 font-medium mb-2">账号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition text-black"
              placeholder="请输入账号"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition text-black"
              placeholder="请输入密码"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition active:scale-[0.98] mt-4"
          >
            登录进入系统
          </button>
        </form>
      </div>
    </div>
  );
}