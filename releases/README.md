# 本地发布目录

## V5 冻结基线 · 2026-09-18

- `awesome-chinese-folk-game-v5.0-freeze-20260918.zip`：冻结检查后的独立包，包含 `FREEZE-MANIFEST.json` 逐文件校验清单。
- 同名 `.zip.sha256`：整包校验。
- `freeze-v5.0-20260918-inventory.json`：本地整个工作目录逐文件清点；自身不参与自身哈希，且不进入发布包。
- 检查范围、修正和验证命令见 `docs/freeze-v5.0.md`。不是 Git 提交或 tag，未远程发布。

## 之前的历史包

- `awesome-chinese-folk-game-v5.0.zip`：灯下旧档 · 视听打磨版，先前生成的视听版原包，原字节保留。
- `awesome-chinese-folk-game-v4.1.zip`：统一目录迁移版，保留备用。
- `未明旧案柜-V4-寄名簿.zip`：迁移前的完整 V4 历史包，保留备用。
- `legacy/`：V1 / V2 / V3 旧版包，用于回溯与存档导出。

新版解压后运行 `awesome-chinese-folk-game/demo/run_demo.py`，或打开 `src/forum_system/index.html`。包含 58 篇主题、9 案数据、全部运行素材、文档和源稿；排除研究抓取、备份、测试存档和依赖目录。请勿把整个 `releases/` 再压进发布包。

压缩包与校验文件留在本地且由 `.gitignore` 忽略；尚未上传到远程仓库或 Release 服务。
