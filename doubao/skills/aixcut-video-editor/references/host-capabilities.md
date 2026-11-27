# 豆包宿主能力登记

已由平台规范确认：

- 插件根目录包含 `plugin.json`，`skills/` 放 Skill，`mcp.json` 声明远程 MCP。
- 只支持远程 MCP；`localhost`、回环地址和本地进程形式不可用于发布。
- 标准 OAuth 由豆包按 MCP 流程完成，插件包内不保存授权地址或客户端凭据。
- 图标为 512×512 PNG/JPEG，单张不超过 500 KiB。

仍需在豆包真机或 Connector 联调中确认：

- OAuth Redirect URL、回调 state/PKCE、refresh 与撤销行为。
- 页面 `browser_handoff` 是否由宿主直接打开，以及打开后页面状态能否回传。
- 帧捕获、真实播放、音频试听与浏览器下载在豆包客户端的表现。导出必须先获得用户确认；页面在线且支持 `export_timeline` 时优先浏览器渲染，页面不可用且素材云端可读时才使用无头渲染。浏览器本地独占素材不能静默回退到无头。
- 附件 materialize、本机文件选择、loopback 辅助工具和超时/并发限制。

未确认时按远程 MCP、页面手动选择素材和结构化状态交付；不扫描本机目录，不要求用户粘贴长期 token。宿主演放能力不足时，音频证据标记 `unjudgeable`。
