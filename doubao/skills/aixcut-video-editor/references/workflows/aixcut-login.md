# 登录与授权

处理 AIXCut OAuth 登录、刷新、撤销和连接状态。

优先使用豆包 Connector 的 OAuth；不要在 Skill 参数、日志或对话中请求长期 token。`aixcut_login` 返回 `authenticated` 前必须确认服务端 grant 仍有效；收到 `MCP_AUTH_GRANT_INACTIVE` 时，让 Connector 清除旧凭据并重新授权一次。
