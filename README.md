# Sbook

个人学习知识库，帮助你集中管理学习资料、整理错题，并通过练习和资料问答巩固知识。

**在线体验：** <[点击访问Sbook](https://tosbook.top)> `可能存在访问问题`

> 联系管理员方式`3013734106@qq.com`

## 功能

- 邮箱和密码注册、登录及退出；使用 Supabase Auth 管理会话。
- 上传、预览、下载和删除 PDF、UTF-8 TXT、Markdown 和 PNG 图片，并按分类和标签整理。
- 提取 PDF、TXT 和 Markdown 的文本并进行关键词检索。PNG 图片可上传和预览，暂不支持图片 OCR/识别。
- 新增、编辑和删除错题，记录答案、解析和知识点。
- 从错题中选择练习，保存作答记录并查看最近记录。
- 对个人资料进行检索问答，展示可核对的原文引用；可选接入 DeepSeek API（兼容 OpenAI Chat Completions）。
- 数据库启用行级安全策略，资料文件存储在 Supabase 私有存储桶中。

## 技术栈

- Next.js 16、React 19、TypeScript
- Supabase Auth、Postgres 和 Storage
- pnpm

> 给开发人员↓

## 部署到 Vercel（已经)

### 1. 初始化 Supabase

创建 Supabase 项目，在项目的 **SQL Editor** 中执行数据库迁移：

[`supabase/migrations/20261109000000_initial_schema.sql`](./supabase/migrations/20261109000000_initial_schema.sql)

如果数据库已经初始化过，还需要执行 [`supabase/migrations/20261114000000_allow_png_knowledge_files.sql`](./supabase/migrations/20261114000000_allow_png_knowledge_files.sql)，为私有存储桶启用 PNG 上传。

在 Supabase Authentication 设置中启用 Email 登录，并根据需要配置邮箱验证和站点 URL。

### 2. 配置 Vercel 环境变量

在 Vercel 项目的 **Settings → Environment Variables** 中设置以下变量，并确保它们应用于要部署的环境：

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目的 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase 项目的 anon/publishable key |
| `AI_API_KEY` | 否 | DeepSeek API 密钥；配置 AI 问答时必填，两个名称任选其一 |
| `AI_MODEL` | 否 | 模型名称；配置 AI 问答时必填，DeepSeek 可用 `deepseek-chat` |
| `AI_BASE_URL` | 否 | DeepSeek API 地址；使用 DeepSeek 时设置为 `https://api.deepseek.com` |

`NEXT_PUBLIC_*` 变量会在 Next.js 构建时写入客户端产物；修改后请重新部署。不要将 Supabase `service_role` 密钥放入 `NEXT_PUBLIC_*` 变量，也不要提交任何密钥到仓库。

### 3. 部署并验证

将仓库导入 Vercel 并部署。部署完成后打开站点注册并登录；如果尚未应用 Supabase 迁移或配置环境变量，相关功能将无法正常使用。

## 本地开发（重要）

### 环境要求

- Node.js 22+
- pnpm 9+
- 一个已完成上述初始化的 Supabase 项目

### 启动步骤

1. 安装依赖：

   ```bash
   pnpm install
   ```

2. 在项目根目录创建 `.env.local`，填入 Supabase 配置（已经）：

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. 启动开发服务器：

   ```bash
   pnpm dev
   ```

4. 打开 <http://localhost:3000>，注册账号后登录。

## AI 问答（已经）

在 Vercel 环境变量或本地 `.env.local` 中配置 DeepSeek 服务端变量，然后重新部署或重启开发服务器：

```dotenv
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=your-deepseek-api-key
AI_MODEL=deepseek-chat
```

只有检索到相关资料后才会请求模型。未配置模型、没有相关资料或模型请求失败时，界面会明确反馈，并保留可查看的资料引用。

聊天界面通过登录态保护的 `POST /api/chat` 请求问答，请求体为 `{"message":"你的问题"}`；成功响应包含 `answer` 和 `citations`，失败响应包含 `error`。

## 本地验证

```bash
pnpm typecheck
pnpm lint
pnpm build
```
