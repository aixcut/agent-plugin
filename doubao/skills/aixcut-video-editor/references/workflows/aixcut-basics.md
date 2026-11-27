# 基础规则

AIXCut 授权、项目上下文、稳定引用、幂等和恢复规则。

先把用户的目标观众、主题或主线、希望观众理解的重点和感受的情绪当作创作目标。完整成片先定主题再选镜头、节奏、文字和声音；局部编辑遵守用户明确的范围。只把真实项目查询、正式回执和回读结果当作事实，工具返回成功只代表动作执行，不代表成片质量。

先确认 scope、active Project、Timeline 和 revision。所有写入使用稳定 ref 与幂等键，结果以 receipt 和 read-back 为准。任何写入成功后，上一份 `plan_context` 都失效；下一次计划写入前必须重新读取 Timeline，用返回的 `revision_after` 更新 `base_revision` 并重建计划，不能复用旧引用或旧 revision。

工具日志、Checkpoint 和 trace 是记账，不是剪辑阶段。先完成当前原子批次，再记录结果，不能为了重写日志或 trace 暂停正在执行的时间线编辑。

如果宿主没有安装 Aixcut 本地 Skill，第一次使用其他 Aixcut Tool 前必须调用 `aixcut_agent_bootstrap(action="start", intent=...)`，加载基础规则和对应专业工作流。插件本地 Skill 可用时优先使用本地 Skill，不需要重复加载 Server Prompt。

前端页面只做一次有界恢复：完成一次 handoff 后检查一次 `page_status`；目标 Project 仍不在线时，停止重开并请用户切换到对应 Project 页面。
