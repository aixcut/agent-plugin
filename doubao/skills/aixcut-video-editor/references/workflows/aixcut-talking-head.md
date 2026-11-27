# 口播精剪

按转录和语义完成口播精剪并保持观点和接缝质量。

先读取 source lines，按语义单元形成 preserve/delete 范围，再执行编辑和字幕验证。

## 语义保留与自然接缝

- 按语义单元划分保留和删除范围，把否定、条件、数字、人名和必要铺垫列入 preserve 清单，不要只看句子是否重复。
- 同一句话有多条重录时，先选完整正确的 take，再删口癖、停顿和重复起头；反过来做会把语义删残。
- ASR 听错或识别错时用 `aixcut_transcript` 改字，不要因为错字删掉本来正确的表达。
- 保留自然呼吸和有意义的停顿；每次剪切后试听接缝，宿主无法试听时把接缝质量标为 `unjudgeable`。
- 口播 A-roll 是上游：语音结构定稿后再做 B-roll、标题、花字、箭头、Motion Graph 等画面包装；上游变化时下游必须重做。

## 单机位说话人画面

素材只有一个固定机位或固定双人镜头时，不把这种素材当成只能保留双人广角。

- 稳定的人物重构景是单机位的正常替代方案，不是伪造新机位；用户要求人画同步时，除非裁切后的画质不可用，否则必须执行。
- ASR 没有区分说话人时不能放弃人画同步；根据问答结构、说话轮次和每个说话人最多一张代表帧建立映射，身份仍不确定的片段才保留双人镜头。
- 每个实质发言片段都要检查画面人物是否等于发声者，并确认头顶完整、没有黑边、没有明显带入另一人的脸或身体。
- 正片开场、结尾、自然互动可以使用双人镜头；其他段落不能仅因素材是单机位而全部保持双人广角。

## 转录纠错

- 听错或识别错的词用 `aixcut_transcript` 改，不要靠删片段绕过去。
- 先 `aixcut_transcript(action="find", source=..., query=...)`：返回句子的 `sentence_id`、`sentence_index`、精确时间，以及可直接使用的词下标区间 `word_start_index` / `word_end_index`，同时给出 `source_file_revision` 与 `transcript_revision`。
- 再用 `aixcut_transcript(action="update", ...)` 带上原样返回的 `sentence_id`、`source_file_revision`、`expected_revision`，以及 `start_index`、`end_index` 和逐词替换的 `new_texts`（数量必须等于区间长度）。
- 版本对不上会被拒绝（`MCP_SOURCE_FILE_REVISION_STALE` / `MCP_TRANSCRIPT_REVISION_STALE`），这时重新 `find` 再改，不要强行重试。
