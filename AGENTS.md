# AGENTS

本文件是任何 AI 编码代理进入本仓库后的第一入口。

目标不是告诉代理“项目里有哪些业务按钮”，而是告诉代理“在这个仓库里如何安全、可复审地完成代码工作”。

## 你正在进入什么仓库

- 这是一个 `Vue 3 + Vite + TypeScript + Supabase` 的 ERP 项目。
- 当前仓库已包含一个页面型 `Harness`，但它现在是观察/调试台，不是仓库级主入口。
- 真正的系统级驾驭工程落点在：入口文档、规则文件、脚本、git hooks、CI、review loop。

## 开始任何任务前先做什么

1. 先读本文件，再按任务类型按需读取 `docs/agent-context/`。
2. 先判断任务风险等级：`low | medium | high`。
3. 先确定改动边界，不要一上来大面积改文件。
4. 改动完成前，至少运行仓库规定的本地 gates。

## 按需读取哪些上下文

- 任务模板：`docs/agent-context/task-template.md`
- 完成定义：`docs/agent-context/definition-of-done.md`
- 风险策略：`docs/agent-context/risk-policy.md`
- 架构约束：`docs/agent-context/architecture-constraints.md`
- 代码审查标准：`docs/agent-context/review-rubric.md`
- 业务域说明：`docs/agent-context/business-domain.md`
- 应用内 Harness 工具契约：`docs/agent-context/tool-contracts.md`
- 页面主题规范：`THEME.md`

## 目录职责

- `src/views/`：页面层。负责展示与轻量交互，不承载复杂 agent 编排。
- `src/lib/`：前端访问层与共享客户端逻辑。
- `src/types/`：稳定类型。
- `scripts/`：仓库级校验、本地 gates、review 脚本。
- `.cursor/rules/`：Cursor 专属增强规则，内容应复用通用文档。
- `.cursor/hooks/`：Cursor 专属 hook 脚本。
- `supabase/migrations/`：数据库 schema 变更，高风险目录。
- `supabase/functions/`：边缘函数与现有 Harness 适配层。
- `.github/workflows/`：远端 CI 与 gates。

## 强制规则

- 不要把仓库级治理逻辑塞进页面。
- 不要跳过 `AGENTS.md` 和 `docs/agent-context/` 直接自由发挥。
- 页面相关调用统一经由共享层，不要在页面里重复散落协议与审查逻辑。
- 高风险变更默认需要人工确认，尤其是数据库迁移、权限、财务、删除、跨层依赖调整。
- 对人展示内容优先中文；稳定字段、事件名、状态值优先英文。

## 本地交付前必须通过

- `npm run verify:docs`
- `npm run verify:agent`
- 如需结构化审查：`npm run review:local`

## 如何理解现有 Harness 页面

- `Harness 控制台`：内部调试与演练台。
- `Harness 运行记录`：观察面板，后续会接本地校验、CI、review、审批结果。
- 不要把“页面里能提需求”误解为“仓库级主工作流已经在页面里完成”。

## 交付输出要求

- 说明改动范围与风险等级。
- 说明运行了哪些验证。
- 如存在高风险或未完成项，明确列出。
