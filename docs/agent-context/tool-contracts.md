# Harness Tool Contracts

本文件描述的是“应用内 Harness 调试台”使用的受控工具契约。

它不是仓库级 AI 编码代理的主规则文件。只有当任务明确涉及现有 `Harness 控制台`、Supabase Edge Functions 或应用内业务动作演练时才需要读取。

## 通用字段

每个 tool 都应具备：

- `id`: 稳定英文 id
- `description_zh`: 中文说明
- `risk_level`: `low | medium | high`
- `requires_approval`: 是否默认需要人工审批
- `allowed_roles`: 可发起角色
- `input_schema`: 入参结构
- `side_effects`: 是否改写业务数据

## 当前首批工具

### `list_staff_tasks`

- 说明：查询某业务员当前任务列表
- 风险：`low`
- 审批：`false`
- 角色：`业务员 | 商务 | 财务 | 管理员`
- 副作用：无

### `assign_buyer`

- 说明：给某个子订单分配买手
- 风险：`medium`
- 审批：`false`
- 角色：`业务员 | 管理员`
- 副作用：更新 `sub_orders`

### `set_refund_method`

- 说明：设置退款方式和退款时序
- 风险：`medium`
- 审批：`false`
- 角色：`业务员 | 管理员`
- 副作用：更新 `sub_orders`

### `submit_refund_request`

- 说明：向财务提交退款申请
- 风险：`high`
- 审批：`true`
- 角色：`业务员 | 管理员`
- 副作用：插入 `refund_requests`

### `return_sub_order`

- 说明：把子订单回转给管理员重新分配
- 风险：`high`
- 审批：`true`
- 角色：`业务员 | 管理员`
- 副作用：更新 `sub_orders` 并写入 `grab_hall_logs`

## 契约原则

- 参数必须结构化，不依赖自由文本猜测。
- 高风险 tool 默认 `requires_approval = true`。
- 返回值必须适合日志化与回放。
- 任何新 tool 都应先定义契约，再进入调试台或执行器。
