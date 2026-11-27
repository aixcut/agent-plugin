# AIXCut 豆包工作流

1. `intent`：只选一个主路由。路由是 Skill 概念，不是写入参数；同一个任务里不并列两个主路由。
   - `inspect_only`：只读查看，或解释为什么导出被挡住；不写时间轴。
   - `mechanical`：精确、可逆、不含创作判断的操作；`plan_context.mode` 用 `mechanical`。
   - `local_edit`：改变局部画面、音频、布局、特效或文字；含创作判断时 `plan_context.mode` 用 `local_edit`。
   - `talking_head`：口播内容决定剪切、顺序和节奏；口癖与停顿清理这类固定动作用 `mechanical`，语义改动用 `local_edit` 或 `full_assembly`。
   - `full_assembly`：素材要变成一条完整成片，跨多个相互依赖的阶段；`plan_context.mode` 用 `full_assembly`。
   - `focused_task`：只做字幕、配音、生成、导出等单一领域的事；精确机械动作用 `mechanical`，带创作判断用 `local_edit`。
   - 绝不把路由名直接当作 `plan_context.mode`：服务端只接受 `mechanical`、`local_edit`、`full_assembly`。
2. `inspect`：确认授权、Project、Timeline、能力和当前 revision，读取最小 snapshot。
3. `plan`：多步骤或破坏性编辑创建 EditPlan，声明 preserve、delete_refs、授权动作和验收范围。
4. `execute`：结构写入串行，生成/导入/导出保留原始 Job 或 operation identity。
5. `verify`：写后 read-back；分别记录 structure、semantic、visual、audio 证据。
6. `deliver`：报告实际完成、待处理 identity、验证范围和不可判断项。
