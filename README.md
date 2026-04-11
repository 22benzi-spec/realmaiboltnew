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
