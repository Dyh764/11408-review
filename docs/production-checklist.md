# 生产部署验收清单

上线前按本清单逐项验收。不要把“本地能启动”当作已经可以生产使用。

## 环境变量

- [ ] Vercel 已配置 `NEXT_PUBLIC_SUPABASE_URL`。
- [ ] Vercel 已配置 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- [ ] Vercel 已配置 `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=question-images`。
- [ ] Vercel 已配置 `SUPABASE_STORAGE_BUCKET=question-images`。
- [ ] Vercel 已配置 `OPENAI_API_KEY`，且没有使用 `NEXT_PUBLIC_` 前缀。
- [ ] Vercel 已配置 `OPENAI_MODEL`。
- [ ] Supabase Edge Functions 已配置 `SUPABASE_URL`。
- [ ] Supabase Edge Functions 已配置 `SUPABASE_SERVICE_ROLE_KEY`。
- [ ] Supabase Edge Functions 已配置 `OPENAI_API_KEY`。
- [ ] Supabase Edge Functions 已配置 `CRON_SECRET`。
- [ ] service role key 只在服务端或 Edge Functions 使用，没有进入客户端代码。

## Supabase

- [ ] 已执行 `supabase/migrations` 中的 SQL。
- [ ] `profiles` RLS 已开启。
- [ ] `questions` RLS 已开启。
- [ ] `reviews` RLS 已开启。
- [ ] `reports` RLS 已开启。
- [ ] `knowledge_stats` RLS 已开启。
- [ ] 测试用户不能读取其他用户数据。
- [ ] Storage bucket `question-images` 已创建。
- [ ] `question-images` bucket 是 private。
- [ ] Storage policy 只允许用户访问 `users/{user_id}/questions/` 下自己的图片。

## Edge Functions 和 Cron

- [ ] `analyze-daily-questions` 已部署。
- [ ] `generate-daily-report` 已部署。
- [ ] `generate-weekly-report` 已部署。
- [ ] `generate-monthly-report` 已部署。
- [ ] Cron 已配置每日分析。
- [ ] Cron 已配置日报。
- [ ] Cron 已配置周报。
- [ ] Cron 已配置月报。
- [ ] Cron 请求必须校验 `CRON_SECRET`。

## 核心功能验收

- [ ] 登录和退出正常。
- [ ] 未登录访问保护页会跳转登录页。
- [ ] 无 Supabase env 时页面有友好提示，不白屏。
- [ ] 手机端上传图片成功。
- [ ] 大图压缩状态显示正常。
- [ ] 上传失败后按钮恢复可点击。
- [ ] AI 分析成功。
- [ ] AI 分析失败时页面不崩溃。
- [ ] `verified` 题干不会被默认覆盖。
- [ ] 今日复习写入成功。
- [ ] 复习按钮重复点击不会重复写入。
- [ ] 日报、周报、月报可以生成并在报告页显示。
- [ ] 报告为空时有空状态提示。
- [ ] `/settings` 可访问。
- [ ] 数据导出 JSON 可用。
- [ ] 数据导出 Markdown 可用。
- [ ] 数据导出 CSV 可用。
- [ ] `/sprint` 可显示高危错题。
- [ ] `/questions` 支持基础批量操作。
- [ ] 批量删除不可用。

## 手机和 PWA

- [ ] iPhone Safari 可用。
- [ ] Android Chrome 可用。
- [ ] 页面没有横向滚动。
- [ ] 底部导航不遮挡内容。
- [ ] 表单输入不被键盘遮挡。
- [ ] 错题详情图片可以放大。
- [ ] 报告页移动端可读。
- [ ] PWA 可添加到桌面。

## 最终命令

在项目根目录运行：

```bash
npm run lint
npm run build
```

两个命令都必须通过后才能发布。
