# 成片编排分阶段细则

本文件是 `aixcut-video-assembly` 的展开说明，回答"每个阶段该读什么、该确认什么"。具体工具参数以各技能和实时 Schema 为准。

每次结构写入后，立即重新读取受影响的 `timeline`、`audio` 或 `captions` view；不要跨 revision 复用旧 ref，也不要等到导出前才第一次核对写入结果。

多版本流程：先 `aixcut_timeline list`，再对源时间轴执行 `duplicate`，为每个版本保存独立的 `timeline_id`。每个版本按“读取目标时间轴 → 编辑 → 同一 `timeline_id` 读回/审查 → 导出”执行；同一 Project 的生成素材和源素材跨版本复用。

| Tool | action |
| --- | --- |
| aixcut_timeline | list |
| aixcut_timeline | create |
| aixcut_timeline | duplicate |
| aixcut_timeline | rename |
| aixcut_timeline | delete |
| aixcut_timeline | reorder |
| aixcut_primary | set |
| aixcut_primary | add |
| aixcut_primary | replace |
| aixcut_primary | delete |
| aixcut_primary | reorder |
| aixcut_voice | set |
| aixcut_voice | add |
| aixcut_voice | update |
| aixcut_voice | delete |
| aixcut_voice | reorder |
| aixcut_voice | render |
| aixcut_voice | settings |
| aixcut_audio | add |
| aixcut_audio | update |
| aixcut_audio | replace |
| aixcut_audio | delete |
| aixcut_audio | trim |
| aixcut_audio | split |
| aixcut_audio | move |
| aixcut_audio | time |
| aixcut_audio | retime |
| aixcut_audio | fade |
| aixcut_caption | mode |
| aixcut_caption | regenerate |
| aixcut_caption | set |
| aixcut_caption | add |
| aixcut_caption | update |
| aixcut_caption | delete |
| aixcut_caption | split |
| aixcut_caption | style |
| aixcut_caption | highlight |
| aixcut_generate | submit |
| aixcut_generate | quote |
| aixcut_generate | get |
| aixcut_generate | execute |
| aixcut_generate | list |
| aixcut_generate | cancel |
| aixcut_frontend | export_timeline |
| aixcut_frontend | export_timeline_status |

## 阶段 0：素材就绪

1. 读项目摘要和素材清单：

```json aixcut_read
{
  "view": "sources"
}
```

2. 不要用旧的服务端分析完成状态判断本机视频是否可用。`import_local_media` 路径先按 `import_status` 等到导入终态；`prompt_add_material` 路径等用户确认后，用 `file_name` 回读 `sources`。
3. 有语音的视频，等对应素材的 `transcript_status` 为 `available` 后再读 `source_lines`；没有语音或没有逐字稿时，画面理解用 `capture_source_frames` / `capture_timeline_frames` 按需取帧。
4. 成片统一走 `aixcut_frontend` 的页面导出，不按是否存在完整云端视频副本分流。
5. 素材缺失或数量不够时，按 `aixcut-timeline-editing` 的「本机素材」提示用户上传，然后结束本轮，等用户上传完成。
6. 素材还在导入或转录中时，稍后重读，不要重新导入，也不要换素材。

素材在用户自己电脑上时，页面必须先打开并且素材要恢复可访问，否则后续抽帧、导出都会失败。

## 阶段 1：画面结构

1. 读 `timeline`，拿到现有片段和目标时长。
2. 先形成轻量的**脚本/镜头计划**：逐镜记录源素材 ref、源入出点、成片起止时间、镜头内容和该画面能支持的文案信息。按需用 `capture_source_frames` 获取画面证据；没有可读画面证据的内容不要写成具体事实。
3. 按目标时长决定每段用哪个素材、从哪一秒开始、放多久。总时长按用户要求凑齐，不要短一截。
4. 画面顺序要有叙事：开场抓人，中段展开，结尾落到行动或情绪落点。
5. 排完之后读回 `timeline`，确认没有空隙、没有重叠、总时长对得上。镜头计划是编排依据，不要未经用户要求自动另存为项目文档。

## 阶段 2：配音文稿

- 文稿长度要匹配画面时长。中文旁白按每秒 4 到 5 个字估算，先算字数再写，不要写完才发现读不完。
- 文稿要有起承转合，不要念素材标题。
- 音色按用户要求选；用户没要求时，给一个和内容调性匹配的默认音色并说明。
- 完整流程见 `aixcut-voice`。

## 阶段 3：配音渲染并落轨

1. **配音渲染**：调用 `aixcut_voice(render)`，等待逐段结果；一次调用完成音频生成或复用、素材登记、配音段绑定和转录，不再轮询旧配音 Job。
2. **旁白音频落轨**：需要完整重排专用配音轨时，在 render 中传 `place=true`，并检查 `placement.status="applied"`；该操作会清空目标配音轨后重建。需要保留既有片段或自定义编排时，不传 place，再通过 `aixcut_audio` 放置音频。之后重读 `timeline`，确认片段、时间和源素材正确。
3. 回读该音频源的 `transcript_status`。只有状态为 `available` 才能继续自动字幕；若仍在转录任务中，稍后重读，不要把缺字幕伪装成成功。

省略 place 且未手动落轨时，生成的音频不会自动出现在成片里。超时表示结果未知，使用相同幂等键和原参数重试。

## 阶段 4：字幕

1. 旁白字幕以**已落轨配音的转录结果**为准，不能只因为有配音文稿就声称已完成转录或字幕。
2. `transcript_status=available` 时调用 `aixcut_caption(regenerate)`，然后读回 `captions`，确认字幕存在且时间与配音相符。
3. 若配音素材未落到时间轴（`MCP_CAPTION_VOICE_AUDIO_NOT_ON_TIMELINE`），先将音频落轨并重读时间线；若状态是待处理（`MCP_CAPTION_TRANSCRIPT_PENDING`）、缺失、过期或空，按错误码如实处理。不得根据文稿伪造“转录完成”。无法完成时继续其余剪辑，但报告字幕未生成及原因。
4. 字幕时间跟着配音走，不跟着画面走。一条字幕不超过两行；长句按语义断句。
5. 自动派生后读回 `captions`，确认条数、首尾时间、文本及模式。手动写入会切换到手动模式，不要为了“修复”而盲目切回自动。
6. 细节见 `aixcut-captions`。

## 阶段 5：背景音乐

1. 音乐轨整条铺满成片时长，或者按段落分成几条。
2. 两端加淡入淡出：音乐片段用毫秒级的 `fade_in_ms` 和 `fade_out_ms`，具体动作取法见 `aixcut-timeline-editing` 的淡入淡出小节。
3. 有配音时按 `aixcut-timeline-editing` 的音量字段把音乐 `volume` 设到 0.2–0.4，保证讲解声清楚；没有配音时可以用正常音量。
4. 音乐和配音都完成后，确认两条音频轨是并行混音，不是互相覆盖。
5. 对素材库中的音乐音频调用 `aixcut_frontend(action=analyze_music_beats)`，输入该音频的 `media_id`。只有结果 `status=available` 且有 `beat_times_ms` 时，才按返回的节拍时间挑选切点；结果中的 BPM、confidence、分析时长和时间戳要作为证据保留。若返回 `unable_to_determine`，或解码/授权失败，则镜头是否卡点写“无法判断”，不得凭听感或时长推测 BPM。
6. 节拍分析是只读的，不会自动切镜头；每次按节拍编辑后仍要重新读取时间线确认切点位置。

## 阶段 6：自检清单

逐项读回并核对，不要凭记忆回答。

| 检查项 | 怎么查 | 通过标准 |
| --- | --- | --- |
| 总时长 | 读 `timeline` | 等于用户要求的时长 |
| 画面完整 | 读 `timeline` | 无空隙、无意外重叠 |
| 配音落轨 | 读 `voice` 和 `timeline` | 配音段状态就绪，且时间轴上有对应音频片段 |
| 字幕条数 | 读 `captions` | 条数合理，首尾时间和配音对得上 |
| 音乐淡化 | 读 `audio` | 音乐片段带淡入淡出 |
| 可导出 | 用 `aixcut_review` 查 `renderability` | 没有阻断项 |
| 转录状态 | 读配音音频源 `transcript_status` | `available` 才能宣称转录可用；其他状态记录原值和处理结果 |
| 音画试听 | 当前 MCP 无法证明导出文件已完整播放和试听 | 未实际播放试听时明确写“完整播放/试听未验证” |

## 阶段 7：导出

按 `aixcut-export` 调用页面导出并轮询。成片没有服务器下载地址，由用户浏览器直接下载，只汇报文件名、体积和格式。

## 现象对照

| 现象 | 真实原因 | 处理 |
| --- | --- | --- |
| 成片没有声音 | 配音只渲染没落轨 | 回到阶段 3 的第 2 步 |
| 配音有了但字幕未生成 | render 可能部分失败、超时或未完成铺轨，字幕也需要单独验证 | 先查逐段结果、placement 和 `transcript_status`；已落轨且转录可用时执行 `aixcut_caption(regenerate)` 并读回 `captions`，否则报告具体状态 |
| 开头结尾很突兀 | 音乐没加淡入淡出 | 给音乐片段补上 |
| 讲解声听不清 | 音乐音量没压低 | 按 `aixcut-timeline-editing` 的字段降低音乐 `volume` |
| 无法证明镜头卡点 | `analyze_music_beats` 返回 `unable_to_determine`，或页面解码/授权失败 | 报告“无法判断”，不虚构 BPM 或卡点镜头 |
| 导出失败但页面明明开着 | 页面导出自身失败或文件访问授权失效 | 查看 `export_timeline_status` 的错误码；必要时让用户在页面点一下恢复授权 |
