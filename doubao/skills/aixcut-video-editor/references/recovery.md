# 恢复规则

- `401/403`：重新核验 OAuth 和 scope。
- 工具未加载或未登录：先让 Connector 完成 OAuth；当前任务仍未加载工具时请用户新开任务，禁止子进程、替代 MCP 客户端或普通 URL 兜底。
- `revision_conflict`：读取当前 revision，重建计划，最多重算两次。
- `unknown`：保留原 mutation id 和 idempotency key，先查 receipt，禁止换 key 重放。
- `pending/running`：沿用原 Job 或 export id 查询，不能报告完成。
- 页面离线：检查 `page_status`，不能拼接普通 Project URL。
- 证据不足：交付 `unjudgeable` 和缺口，不用模型自评替代真实帧或试听。
