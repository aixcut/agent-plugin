---
name: aixcut-talking-head
description: 剪辑口播、访谈、课程和播客视频，重点去掉口误、停顿和废话并保持字幕同步。用户提到口播、访谈、播客、课程、念稿或去水词时使用。不用于音乐卡点、纯画面混剪或整片广告编排。（英文：talking head、interview、podcast、remove filler words）
---

# Aixcut 口播剪辑

## 最短路径

1. 分页读 `aixcut_read(view="source_lines")`：默认每页 200 行，用 `next_offset` 继续读到 `has_more=false`，先取得完整口播文本和时间。不要整份请求 `word-time`。
2. 挑出要处理的句子后，再用 `selectors` 和 `include=["word-time"]` 补读词级时间；每页最多 50 行。
3. 按用户要求执行 `aixcut_speech`。
4. 字幕跟随主口播轨；需要时用 `aixcut_caption` 同步或重生成。
5. 读回 `timeline` 或 `speech` view，确认结果。

## 执行顺序

口播剪辑里语音时间是锚，下游全部依赖它，顺序不能换：

1. 先定口播结构：删口误、废话、停顿和重复片段。
2. 口播定稿后再动画面：B-roll、覆盖镜头的插入或删除。
3. 画面定稿后再动字幕：字幕时间跟着最终口播走。
4. 音乐和音效放在最后，按最终总时长铺。

改了上游就必须回到下游重做，不要只改一边。每完成一个大步骤读回一次，再进下一步。

## 口播动作

| 场景 | 动作 |
| --- | --- |
| 用一段新口播替换整段 | `set` |
| 在某处插入新内容 | `insert` |
| 删掉口误、废话、整句 | `delete` |
| 换掉某个片段的来源 | `replace`（需要 `source` 和 `target`） |
| 缩短停顿或掐头去尾 | `trim` |
| 回到原始口播 | `reset` |

`delete` 和 `trim` 支持 `target` 或 `targets`，可一次处理多个范围。删除和裁剪会改变后续位置，因此每次结构变化后必须重新读取再继续。

## 边界

- `aixcut_speech` 只操作主口播轨；B-roll、画面片段用 `aixcut_clip`，背景音乐和音效用 `aixcut_audio`。
- 不要用 `aixcut_text` 处理字幕。
- 每批修改用一个新 UUID，不要把同一个 UUID 复用于不同批次。

## 高频漏项

- 字幕不要在上游还没定稿时先做，否则口播一动字幕全废。
- 口播删除会改变后续位置，每批结构变化后必须重新读取再继续。
- 画面被替换或裁剪后，字幕时间要重做，不能只改口播。

## 完成判定

口播文本已经覆盖用户的修改意图、`timeline` 读回后位置正确、字幕与口播对齐。完成后报告删除和新增的片段数量以及新的 revision。需要核对画面时用 `aixcut_review`。
