# 揽麦 ERP

这是一个基于 `Vue 3 + Vite + TypeScript + Supabase` 的 ERP 项目，核心业务围绕订单、子订单、买手、退款、转单和工作台流程。

## 本地开发

```bash
npm install
npm run dev
```

项目启动前会检查：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

相关脚本在 `scripts/check-supabase-env.mjs`。

## AI 编码代理入口

如果你是在 Cursor、Claude Code、Codex、Cline 或其他 AI 编码工具中进入本仓库，请先读：

- `AGENTS.md`
- `docs/agent-context/task-template.md`
- `docs/agent-context/risk-policy.md`
- `docs/agent-context/architecture-constraints.md`
- `docs/agent-context/definition-of-done.md`

这些文件共同定义了仓库级驾驭工程，而不是只定义应用内某个页面的交互。

## 仓库级验证命令

```bash
npm run verify:docs
npm run verify:agent
npm run review:local
```

## 现有 Harness 页面定位

- `Harness 控制台`：内部调试与演练台
- `Harness 运行记录`：观察面板，后续承接本地校验、CI、review 与审批结果

它们不是仓库级 AI 编码工作流的唯一入口。
