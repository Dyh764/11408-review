# 数据备份与恢复说明

当前版本支持导出，不支持一键导入或完整自动恢复。请不要把 JSON 导出理解为已经具备“一键恢复”能力。

## 1. 导出 JSON

1. 登录自己的账号。
2. 打开 `/settings`。
3. 点击“导出 JSON”。
4. 保存形如 `11408-review-export-2026-06-04.json` 的文件。

JSON 用于完整备份，包含：

- `questions`
- `reviews`
- `reports`
- `knowledge_stats`

导出只读取当前登录用户的数据。导出不会包含 API Key、service role key、access token 或 refresh token。

## 2. 保存图片

导出文件不会直接打包原图，只会保留 `image_path`，例如：

```text
users/{user_id}/questions/{question_id}.jpg
```

图片保存在 Supabase Storage 的 private bucket 中。signed URL 只是临时预览地址，可能过期，不能当作长期备份。

备份图片的建议方式：

1. 在 Supabase Dashboard 打开 Storage。
2. 进入 `question-images` bucket。
3. 按用户路径 `users/{user_id}/questions/` 下载原图。
4. 和 JSON 导出文件保存在同一个备份目录。

## 3. 从 Supabase 导出数据库

推荐在 Supabase Dashboard 使用数据库备份功能，或使用 Supabase CLI / PostgreSQL 工具导出。

需要覆盖的表：

- `public.profiles`
- `public.questions`
- `public.reviews`
- `public.reports`
- `public.knowledge_stats`

导出时注意不要把 Auth token、service role key、项目密钥写入备份说明或公开仓库。

## 4. 备份 Supabase Storage

需要备份的 bucket：

- `question-images`

重点路径：

```text
users/{user_id}/questions/
```

bucket 应保持 private。不要为了备份方便改成 public。

## 5. 恢复数据

当前版本没有内置一键导入页面。恢复需要手动执行：

1. 先恢复 Supabase 数据库表。
2. 再恢复 Storage bucket 中的原图文件。
3. 确认 `questions.image_path` 仍指向已恢复图片。
4. 确认 RLS 仍开启，用户只能访问自己的数据。
5. 使用测试账号登录，检查错题详情、复习页、报告页和导出功能。

## 6. 当前限制

- 暂不支持一键导入 JSON。
- 暂不支持把图片打包进导出文件。
- 暂不支持自动校验 JSON 和 Storage 图片是否完全匹配。
- signed URL 会过期，不能作为长期图片地址。

## 7. 后续 TODO

- 增加只读导入预检：检查 JSON schema、用户归属和 `image_path`。
- 增加 Storage 图片缺失报告。
- 增加管理员级恢复脚本，但不在客户端暴露 service role key。
- 增加恢复后的数据一致性检查。
