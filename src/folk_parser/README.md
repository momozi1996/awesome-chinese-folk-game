# 本地剧本解析器

仓库根目录：

```sh
python3 -m src.folk_parser check
python3 -m src.folk_parser list
python3 -m src.folk_parser build
```

只使用 Python 标准库。扫描两类主题目录中的 Markdown 与 `cases/playable/*/case.md`，解析简单标量前置信息，读取同目录 JSON 并校验 ID、条件引用、场景资源、答案、线索可达性及连续案交接环路。

`build` 确定性生成三个文件：
1. `src/forum_system/data.js`：可玩案卷的离线快照（不是手工编辑源）。
2. `cases/catalog.json`：主题与可玩案卷的机器目录。
3. `docs/case_list.md`：带链接的阅读目录。

主题 `kind: theme / status: planned` 不编进游戏；可玩内容需 `kind: playable / status: playable / source: case.json`。前置信息是 `key: scalar value`，**不是完整 YAML**，暂不支持嵌套字段或 YAML 引号语法。标题不必加引号。

本地内容为可信创作输入，帖子允许有限的手写 HTML；这不是对任意互联网剧本的 HTML 沙箱。第三方内容需人工审查后导入。
