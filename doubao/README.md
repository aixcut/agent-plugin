# AIXCut 豆包插件

AIXCut 面向豆包的全能剪辑专家 Plugin 包，覆盖口播精剪、直播切片、电商信息流、TVC 广告和矩阵批量生产。按豆包 Plugin 1.0 结构组织：根目录 `plugin.json` 声明插件，`skills/` 放 Skill，`mcp.json` 连接远程 Aixcut MCP 服务，`com.doubao/` 放豆包扩展资源。

## 包结构

```text
aixcut-doubao-plugin/
├── plugin.json                 # 插件根清单与豆包展示配置
├── mcp.json                    # Aixcut 远程 MCP 连接
├── com.doubao/assets/          # 插件图标（512×512 PNG）
├── skills/
│   └── aixcut-video-editor/    # 唯一入口 Skill
│       ├── SKILL.md
│       ├── references/         # 工作流、工具路由、质量门禁、恢复规则
│       ├── agents/             # 兼容技能单包形态的连接器声明
│       └── vendor/plugin-core/ # 构建期注入的 Core 锁定快照
├── contracts/                  # 版本锁、工具清单、提交材料
├── scripts/                    # 校验、打包、提交材料生成
└── dist/                       # 构建产物
```

每份 Skill 必须直接位于 `skills/` 下，`SKILL.md` 的 `name` 与目录名一致。详细工作流放在 `references/` 中用相对路径引用；不要放在 `skills/<name>/sub-skills/`，二层目录不会被豆包加载。

## 构建

```bash
npm run sync-core -- --source ../aixcut-plugin-core --root .
npm run generate-catalog
npm test
npm run validate
npm run package
npm run generate-submission
```

`npm run package` 生成两个 ZIP：

- `dist/aixcut-plugin-<version>.zip`：Plugin 包，根目录包含 `plugin.json`、`mcp.json`、`skills/` 和 `com.doubao/`。
- `dist/aixcut-skill-<version>.zip`：独立技能包，`SKILL.md` 直接位于 ZIP 根目录，用于只提交技能的场景。

打包时同时校验豆包发布限制：ZIP ≤16 MB、条目 ≤1024、单文件 ≤2 MB、解压总量 ≤16 MB、Skill ≤10 个。

## 上架材料

- 展示文案、标签、快捷提示词和提审示例提示词：`contracts/submission-manifest.json`
- 生成后的完整提交说明：`dist/submission/aixcut-doubao-plugin-submission-<version>.md`
- 工具验收矩阵：`dist/submission/aixcut-doubao-tool-matrix-<version>.json`
- 图标：`com.doubao/assets/plugin-icon.png`（512×512 PNG，≤500 KiB）

平台侧仍需补齐：插件主体 ID、Redirect URL、评测报告链接、测试账号与维护联系人。所有平台验收状态保持 `pending_platform_live`，本地测试和打包通过不代表豆包准入完成。
