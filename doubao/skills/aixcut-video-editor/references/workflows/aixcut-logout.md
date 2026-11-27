# 退出授权

退出 AIXCut MCP 服务端授权并清理豆包 Connector 本地凭据。

先调用一次 `aixcut_logout` 撤销服务端 grant；当结果要求本地清理时，通过豆包 Connector 断开并清除本地 OAuth 凭据。两边都确认后才报告完全退出，不读取或输出 token。
