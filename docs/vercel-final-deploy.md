# Vercel 最终部署说明

本文档用于第七阶段上线前检查。目标是把当前 `11408-review` 仓库部署到 Vercel，并确保没有本地路径、明文密钥、客户端 service role key 或 `.env.local` 缺失导致的白屏。

## 部署前本地检查

在项目根目录运行：

```bash
npm run lint
npm run build
```

如果 Windows 本机 PATH 没有正确指向 Node 20.9+，先把可用的 Node 目录加入 PATH，再运行上述命令。不要通过修改源码绕过构建失败。

## 连接 GitHub 仓库

1. 在本地确认工作区干净：`git status`。
2. 将当前分支推送到 GitHub。
3. 在 GitHub 仓库中确认没有提交 `.env.local`、真实 API Key、service role key 或本地绝对路径。
4. README 和 `docs/` 中的密钥示例必须只使用占位符。

## 导入 Vercel 项目

1. 打开 Vercel Dashboard。
2. New Project，选择 GitHub 中的 `11408-review` 仓库。
3. Framework Preset 选择 `Next.js`。
4. Root Directory 保持仓库根目录。
5. Install Command 保持默认 `npm install`。
6. Build Command 使用 `npm run build`。
7. Output Directory 留空，使用 Next.js 默认输出。
8. Node.js Version 选择 Vercel 当前支持的 Node 20+ 或 Node 22+。

## Vercel 环境变量

Production 和 Preview 至少配置：

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-public-key>
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images
SUPABASE_STORAGE_BUCKET=question-images
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-4.1
```

规则：

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以给浏览器使用。
- `OPENAI_API_KEY` 不能带 `NEXT_PUBLIC_` 前缀。
- `SUPABASE_SERVICE_ROLE_KEY` 不需要放在 Vercel 前端项目中；它只放在 Supabase Edge Functions secrets。
- 所有真实 key 只写入 Vercel/Supabase 控制台，不写入代码和文档。

## 域名设置

1. 首次部署后先使用 Vercel 默认域名验收。
2. 自定义域名在 Vercel Project Settings -> Domains 添加。
3. 按 Vercel 提示配置 DNS。
4. 域名生效后，在 Supabase Auth 的 Site URL 和 Redirect URLs 中加入生产域名。
5. 如果使用邮箱确认或 magic link，确认邮件中的跳转域名是生产域名。

## 部署后页面检查

部署完成后按顺序打开：

- `/`
- `/login`
- `/upload`
- `/review`
- `/questions`
- `/reports`
- `/settings`
- `/sprint`
- `/manifest.json`

预期：

- 未登录访问保护页会跳转 `/login?next=...`。
- 未配置 Supabase env 时页面显示提示，不白屏。
- 已登录后保护页可进入。
- 手机宽度下没有明显横向滚动。
- 底部导航不遮挡最后一个按钮或输入区。
- PWA manifest 返回 JSON，名称和图标正常。

## 上线前代码检查

当前项目检查结论：

- 没有依赖本地文件系统保存题图；图片保存到 private Supabase Storage。
- 图片路径约定为 `users/{user_id}/questions/{question_id}.{ext}`。
- 页面通过 Supabase signed URL 读取私有图片。
- service role key 只在 `supabase/functions/**` 中通过 Deno env 读取。
- 前端 Supabase client 只读取 public URL 和 anon key。
- 缺少 `.env.local` 时，页面显示配置提示并禁用真实读写。
- Next 16 路由保护使用 `proxy.ts`，不再使用已弃用的 `middleware.ts` 文件名。

## 常见错误排查

| 现象 | 排查 |
| --- | --- |
| Vercel build 失败 | 本地先运行 `npm run lint` 和 `npm run build`，检查 Node 版本、TypeScript 错误和 Next 构建日志。 |
| 页面提示 Supabase 未配置 | 检查 Vercel 是否配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。 |
| 未登录访问保护页没有跳转 | 检查 `proxy.ts` 是否在项目根目录，且函数名为 `proxy`。 |
| 上传失败 | 检查 Storage bucket、MIME type、路径 policy 和用户是否登录。 |
| AI 分析失败 | 检查 `OPENAI_API_KEY`、模型权限、额度和 Storage 图片下载权限。 |
| 报告为空 | 先手动调用 Edge Function，再检查 `reports` 表是否有当前用户数据。 |
| PWA 名称或图标异常 | 检查 `/manifest.json`、`app/layout.tsx` metadata 和浏览器缓存。 |

