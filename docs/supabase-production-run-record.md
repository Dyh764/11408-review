# Supabase 生产联调记录

本文档记录 Stage 9 的 Supabase 生产联调结果。没有连接真实 Supabase 项目的项目必须保持“未验证”。

| 项目 | 记录 |
| --- | --- |
| Supabase project ref | 未填写 |
| migration 执行时间 | 未验证 |
| Storage bucket 名称 | question-images |
| RLS 检查结果 | 未验证 |
| Auth 登录测试结果 | 未验证 |
| questions 插入测试结果 | 未验证 |
| Storage 上传测试结果 | 未验证 |
| reviews 生成测试结果 | 未验证 |
| reports 读取测试结果 | 未验证 |
| knowledge_stats 更新测试结果 | 未验证 |
| system-check 结果 | 未验证 |
| 已发现问题 | 当前未连接真实 Supabase 生产项目。 |
| 修复情况 | 无生产实测问题可修复。 |
| 是否通过 Supabase 生产联调 | 未通过；等待真实生产项目联调。 |

当前无法连接真实 Supabase。需要用户完成：

- 创建 Supabase project。
- 执行 SQL migration。
- 创建 Storage bucket。
- 配置 Vercel env。
- 配置 Supabase Auth redirect URL。
- 配置 Edge Function secrets。

真实密钥只允许保存在 Vercel Dashboard、Supabase Dashboard、Supabase Functions secrets 或本机未提交的 `.env.local` 中，不写入仓库文档。
