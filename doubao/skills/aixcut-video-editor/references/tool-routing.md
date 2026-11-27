# Tool 路由

写操作前先看 [工具字段速查](tool-fields.md)：每个 action 的必填字段、`aixcut_frontend` 的字段摆放规则，
以及破坏性动作的 `plan_context` 完整示例（不能传空对象）。

- 项目：`aixcut_open`、`aixcut_exit_project`、`aixcut_read`。
- 主序列：`aixcut_primary`、`aixcut_speech`、`aixcut_clip`。
- 文字与声音：`aixcut_text`、`aixcut_audio`、`aixcut_track`、`aixcut_caption`。
- 画面位置、文字样式与批量编排：`aixcut_layout`、`aixcut_style`、`aixcut_arrange`；先读 `layout`、`style` 或对应 `_catalog`。
- 视觉增强与结构：`aixcut_effect`、`aixcut_transition`、`aixcut_mask`、`aixcut_group`、`aixcut_node`、`aixcut_component`、`aixcut_generator`、`aixcut_motion`、`aixcut_keyframe`；先读对应只读 view 或 `_catalog`。
- 转录纠错：`aixcut_transcript`；先 `find` 拿到句子身份与词下标，再带 revision 调用 `update`。
- 生成与语音：`aixcut_generate`；语音使用 `speech_read`、`speech_edit`、`speech_quote`、`speech_submit` action。
- 页面：`aixcut_frontend`；先 `page_status`，再素材选择、帧捕获或页内导出。
- 无头渲染：`aixcut_export`；`submit` 提交图片/媒体渲染，`get` 查询，`cancel` 取消；成功只返回短期 artifact 地址。
- Agent 持有文件的上传：`aixcut_media`；`prepare_upload`、`complete_upload`、`upload_status`，上传完成后仍需在素材库确认可编辑资产。
- 检查：`aixcut_review`；对不支持的证据标记 `unjudgeable`。
