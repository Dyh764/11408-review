# Vercel 生产部署联调记录

本文档记录 Stage 9 的 Vercel 生产部署初验结果。没有真实执行的项目必须保持“未验证”。

| 项目 | 记录 |
| --- | --- |
| 部署平台 | Vercel |
| 项目名称 | 11408-review |
| 生产 URL | 未填写 |
| 部署时间 | 未验证 |
| Git 分支 | codex/mvp-stage |
| baseline commit hash | fc0a94a |
| Stage 9 commit hash | 见最终交付输出中的最新 commit hash |
| 环境变量检查结果 | 未验证 |
| 首页访问结果 | 未验证 |
| 登录页访问结果 | 未验证 |
| 上传页访问结果 | 未验证 |
| manifest 访问结果 | 未验证 |
| system-check 结果 | 未验证 |
| Playwright production smoke test 结果 | 未验证 |
| 已发现问题 | 当前未进行真实 Vercel 部署。 |
| 修复情况 | 无生产实测问题可修复。 |
| 是否通过生产部署初验 | 未通过；等待真实部署后验收。 |

等待用户完成 Vercel 项目创建和环境变量配置后填写。

## 生产冒烟测试命令

不要把真实生产 URL 写死到仓库。部署后在本机临时设置：

```bash
E2E_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

Windows PowerShell:

```powershell
$env:E2E_BASE_URL="https://your-app.vercel.app"; npm run test:e2e
```
