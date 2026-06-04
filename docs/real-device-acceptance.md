# 真机使用验收记录

本文档用于上线前真实设备验收。当前 Codex 会话无法直接操作用户手机，因此本次记录分为“已完成的本地/浏览器检查”和“需要用户在手机上实测”。

## 测试设备

当前会话：

- Windows 本机开发环境。
- 本地 production server HTTP 路由检查已完成。

上线前仍需用户实测：

- iPhone + Safari。
- Android 手机 + Chrome。

## 测试浏览器

当前会话：

- Next.js production build 已生成页面路由。
- 本地 production server 已检查核心路径和 PWA manifest。

上线前仍需：

- iPhone Safari 打开生产域名。
- Android Chrome 打开生产域名。
- 如果使用微信/QQ 内置浏览器，只作为辅助检查，不作为主要验收浏览器。

## 登录测试

验收步骤：

1. 未登录打开 `/upload`。
2. 应跳转 `/login?next=/upload`。
3. 输入邮箱和密码登录。
4. 登录后回到 `/upload`。
5. 退出登录后再次访问保护页，应重新跳转登录页。

当前代码检查：

- 保护页列表在 `proxy.ts`。
- 登录页会读取 `next` 参数并用 `router.replace(nextPath)` 跳转。
- `next` 参数只允许站内路径，避免跳到外部 URL。

## 拍题上传测试

验收步骤：

1. 在手机进入 `/upload`。
2. 点击上传区域。
3. 选择“拍照”。
4. 拍摄一张题图。
5. 确认预览清晰。
6. 保存错题。
7. 在 Supabase Storage 确认文件位于 `users/{user_id}/questions/{question_id}.{ext}`。
8. 在 `questions` 表确认记录存在。

当前代码检查：

- 上传页使用 `capture="environment"`。
- 支持 jpg、jpeg、png、webp。
- 超过 8MB 会提示。
- Storage 上传失败不会继续写入 `questions`。
- `questions` 写入失败会尝试删除刚上传的图片。

## 相册上传测试

验收步骤：

1. 在 `/upload` 选择相册图片。
2. 确认预览。
3. 保存。
4. 在错题详情页查看原图。

预期：

- 图片可预览。
- 保存后 `/questions/[id]` 能打开。
- signed URL 过期后刷新页面应重新生成预览 URL。

## 图片压缩测试

验收步骤：

1. 选择一张大于 2MB 的题图。
2. 确认页面显示压缩状态。
3. 保存后确认上传大小合理。
4. 选择一张小图，确认系统保留原图。

当前代码检查：

- `compressImage` 失败时返回原图。
- 压缩后不比原图小，也会使用原图。
- JPEG 最低质量不低于配置的 `minQuality`。

## 错题详情查看测试

验收步骤：

1. 从“错题”进入某道题详情。
2. 查看原题图片。
3. 点击图片放大。
4. 编辑题目文字、章节、知识点、备注。
5. 保存后刷新页面。

预期：

- 原始 `image_path` 不被编辑操作修改。
- `verified` 状态可以保存。

## AI 分析测试

验收步骤：

1. 打开错题详情。
2. 点击“分析这道题”。
3. 如果没有 OpenAI Key，应显示 mock fallback 结果。
4. 如果有 OpenAI Key，应写入真实分析字段。
5. 对 `verified` 题干重新分析，默认不允许覆盖题目文字。

当前代码检查：

- API route 要求登录。
- OpenAI 输出有 schema 校验。
- `buildAnalysisUpdatePayload` 默认保护 verified 题干。

## 今日复习测试

验收步骤：

1. 打开 `/review`。
2. 选择一条到期或逾期复习。
3. 点击“仍不会 / 有进步 / 已掌握 / 复习后又错”。
4. 快速重复点击按钮。
5. 刷新页面检查该任务不再重复显示。

当前代码检查：

- 写入中通过 `processingReviewId` 禁用按钮。
- update 条件包含 `.is("completed_at", null)`。
- 后续计划用 upsert 防止重复日期。

## 报告查看测试

验收步骤：

1. 打开 `/reports`。
2. 切换日报、周报、月报。
3. 如果没有报告，确认显示空状态。
4. 手动触发报告 Edge Function 后刷新页面。

预期：

- 空报告不白屏。
- 多份报告时可选择历史报告。

## 导出测试

验收步骤：

1. 打开 `/settings`。
2. 导出 JSON。
3. 导出 Markdown。
4. 导出 CSV。
5. 打开文件确认只包含当前用户数据。

当前代码检查：

- 导出查询显式 `.eq("user_id", userId)`。
- RLS 仍是最终安全边界。

## PWA 添加到桌面测试

验收步骤：

1. 手机打开生产域名。
2. 添加到主屏幕。
3. 从桌面图标打开。
4. 检查名称和图标。
5. 检查底部导航安全区。

当前代码检查：

- `public/manifest.json` 已配置 name、short_name、display、theme_color、icon。
- `app/layout.tsx` 已配置 `applicationName`、icons、apple web app metadata。

## 弱网测试

验收步骤：

1. 手机浏览器切换弱网或使用系统网络限制。
2. 打开登录、上传、错题详情、报告。
3. 测试上传中断和失败提示。

预期：

- 失败有错误提示。
- 按钮状态能恢复。
- 不生成重复错题或重复复习。

## 已发现问题

- 当前会话无法直接完成真实手机 Safari / Chrome 验收。
- 当前会话未连接真实生产 Supabase 项目执行 Edge Functions。
- 当前会话未完成视觉截图级移动端检查；已完成 HTTP 可访问性和代码侧安全区检查。

## 已修复问题

- 已迁移 `middleware.ts` 到 `proxy.ts`，消除 Next 16 构建警告。
- 已增加底部导航和主内容的安全区 padding，降低手机底部遮挡风险。
- 已补充 PWA metadata，降低添加到桌面后名称或图标异常风险。

## 暂未修复问题

- 未提供一键导入恢复。
- 未提供复杂离线缓存。
- 未提供自动化真实设备云测试。

## 结论

当前已完成本地代码侧和文档侧验收准备。正式上线前，用户仍需在生产 Vercel 域名和生产 Supabase 项目上，用 iPhone Safari 与 Android Chrome 完成实机检查。
## Stage 8 real-device acceptance table

Current phase only completed desktop Chrome mobile viewport acceptance. iPhone Safari and Android Chrome must be completed by the user on real devices after deployment.

| Test item | iPhone Safari | Android Chrome | Desktop Chrome mobile viewport | Result | Issue | Fix status |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Pending real device | Pending real device | Login page smoke test passed | Pending | None | Pending real device |
| Logout | Pending real device | Pending real device | Code path exists | Pending | None | Pending real device |
| Camera upload | Pending real device | Pending real device | Not available on desktop | Pending | None | Pending real device |
| Album upload | Pending real device | Pending real device | Needs manual file selection | Pending | None | Pending real device |
| Image compression | Pending real device | Pending real device | Existing unit logic | Pending | None | Pending real device |
| Save question | Pending real device | Pending real device | Requires real Supabase login | Pending | None | Pending real device |
| AI analysis or mock fallback | Pending real device | Pending real device | Requires real question data | Pending | None | Pending real device |
| Question detail | Pending real device | Pending real device | Protected route smoke covered | Pending | None | Pending real device |
| Question text edit | Pending real device | Pending real device | Requires real question data | Pending | None | Pending real device |
| Today's review | Pending real device | Pending real device | Protected route smoke covered | Pending | None | Pending real device |
| Review result buttons | Pending real device | Pending real device | Requires real review data | Pending | None | Pending real device |
| Reports page | Pending real device | Pending real device | Protected route smoke covered | Pending | None | Pending real device |
| Sprint mode | Pending real device | Pending real device | Smoke covered reachable/login behavior | Pending | None | Pending real device |
| Data export | Pending real device | Pending real device | Requires logged-in data | Pending | None | Pending real device |
| Add to home screen | Pending real device | Pending real device | Manifest smoke covered | Pending | None | Pending real device |
| Weak network | Pending real device | Pending real device | Not automated | Pending | None | Pending real device |
| Horizontal scroll | Pending real device | Pending real device | Home mobile viewport smoke passed | Pending | None | Pending real device |
| Bottom nav overlap | Pending real device | Pending real device | Bottom nav smoke covered | Pending | None | Pending real device |
| Keyboard overlap input | Pending real device | Pending real device | Requires real soft keyboard | Pending | None | Pending real device |
