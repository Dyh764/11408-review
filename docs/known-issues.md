# 已知问题

本文档记录第七阶段上线前仍需人工验收或后续阶段处理的问题。没有列在这里的问题不代表永远不会发生，只代表当前代码和本地验证没有复现。

## 当前未完成

1. 真实生产环境端到端验收尚未完成。
   - 本地已经通过 `npm run lint` 和 `npm run build`。
   - 仍需要部署到 Vercel 后，用真实 Supabase 生产项目、真实手机和真实账号验收。

2. Edge Functions 没有在本机执行 Supabase CLI 运行时验证。
   - 当前已完成代码路径检查和构建侧检查。
   - 仍需要在 Supabase 项目中部署后手动调用四个函数，并查看 logs。

3. 真实手机 Safari / Chrome 尚需用户实测。
   - 本地可继续用浏览器移动视口检查页面布局。
   - 生产上线前应在 iPhone Safari 和 Android Chrome 上验证拍照、相册、登录、PWA 和弱网。

4. 当前版本只支持数据导出，不支持一键导入恢复。
   - JSON 导出保留核心表数据。
   - Storage 图片不会打包进导出文件，只保留 `image_path`。

5. 当前 PWA 不做复杂离线缓存。
   - 这样可以避免离线缓存影响错题、复习和报告数据实时性。
   - 后续如需离线模式，应先设计同步和冲突处理。

## 已在第七阶段修复

- Next 16 `middleware.ts` deprecation warning：已迁移到 `proxy.ts`，保护路由逻辑保持不变。
- 手机底部导航遮挡风险：主内容底部 padding 和底部导航 padding 已加入 `safe-area-inset-bottom`。
- PWA 安装名称和图标元信息：已在 metadata 中补充 `applicationName`、`icons` 和 `appleWebApp`。

## 后续观察项

- 如果 Vercel 构建环境出现 Node 版本问题，检查 Project Settings 中的 Node.js Version。
- 如果 Windows 本机 `npm run lint` 或 `npm run build` 出现 `Access is denied`，先确认 PATH 中是否包含可用 Node 目录。
- 如果报告为空，优先检查 Cron 是否运行、reports 表是否有当前用户数据、Edge Function secrets 是否完整。

