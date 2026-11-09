# Sbook

个人学习知识库 MVP：安全登录、资料管理、错题本、练习记录，以及基于资料检索并引用来源的问答。

## 功能范围

- 邮箱/密码注册、登录和退出；Supabase Auth 负责会话，数据库和文件都按用户隔离。
- 上传、预览、下载和删除 PDF、UTF-8 TXT、Markdown 文件；支持分类和标签。
- PDF/TXT/Markdown 文本提取和关键词检索。扫描件 OCR、图片识别暂不支持。
- 手动新增、编辑、删除错题，记录正确答案、解析和知识点。
- 从错题中选择练习并持久化每次作答，支持回看最近 50 条记录。
- 问答只检索当前账号的资料并展示原文引用。模型 API 可选；未配置时显示检索到的资料片段，不会伪装成 AI 回答。
- 当前没有后台服务角色密钥、第三方模型密钥或测试账号写入前端。

## 环境要求

- Node.js 22+
- pnpm 9+（项目同时保留 npm 锁文件）
- Supabase 项目

## 启动

1. 安装依赖：

   ```bash
   pnpm install
   ```

2. 在 Supabase 创建项目。在项目的 **SQL Editor** 中执行 [`supabase/migrations/20261109000000_initial_schema.sql`](./supabase/migrations/20261109000000_initial_schema.sql)。该迁移会创建数据表、用户隔离策略和私有文件存储桶。

3. 在 Supabase 项目设置中启用 Email 登录，并按需设置邮箱验证和站点 URL。

4. 复制 `.env.example` 为 `.env.local`，填入 Supabase 的 Project URL 和 anon/publishable key：

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   **不要**将 `service_role` 密钥放进 `NEXT_PUBLIC_*` 变量或提交到仓库。

5. 启动：

   ```bash
   pnpm dev
   ```

   打开 <http://localhost:3000>，注册邮箱账号后登录。

## 配置 AI 问答（可选）

在 `.env.local` 中添加 OpenAI-compatible Chat Completions 服务配置，然后重启服务：

```dotenv
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-server-side-api-key
AI_MODEL=your-chat-model
```

三个变量均只在服务端读取。`AI_BASE_URL` 默认为 OpenAI API 地址；也可设置兼容该接口的服务地址。只有成功检索到相关资料后才会调用模型。服务未配置、无相关资料或模型请求失败时，界面会明确反馈并保留可核对的来源引用。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm build
```

部署时需在**构建阶段**配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Next.js 会将 `NEXT_PUBLIC_*` 值编入浏览器代码），并在运行环境配置相同值；AI 环境变量按需作为服务端变量配置。数据库迁移必须先应用到目标 Supabase 项目。
