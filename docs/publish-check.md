# 提交前检查 · 当前版本与目录

## 只认这个源码目录

**`awesome-chinese-folk-game/` 项目根目录是最新完整源码，版本 `6.2.0-preview`。**

在本次交付环境中的路径为：

```text
/Users/jyxc-dz-0100378/TESTBMK/awesome-chinese-folk-game
```

路径中的用户名只是交付机器的位置，代码与启动器不依赖这个绝对路径。复制到任意目录后仍可运行。

- `main.py`：正式入口，加载同一套最新源码。
- `demo/run_demo.py`：同一个入口的便捷启动器，**不是旧版 Demo**。
- `src/forum_system/index.html`：最新离线页面；保留整个 `src/`，不能仅复制 `forum_system/`。
- `CURRENT_VERSION.json`：明确版本、入口和最新离线包名；与 `src/forum_system/package.json` 的版本一致。
- 同级 `awesome-chinese-folk-game-review/` 是审查报告与截图，**不是游戏源码，不要拿它提交**。
- `releases/` 是本地包，`backups/` 是历史备份，`docs/history/` 是标明历史的说明；都不是另一个“当前源码”。

## 本版确实包含

- V6 夜班终端、现场美术、证据对照与可选物件 3D。
- V6.1 SVG 夜读演出、原文 TTS 旁读、转场与可访问控制。
- V6.2 删除连续雨/风/水/电流底噪；本地 CC0 悬疑钢琴、音乐独立开关/音量、讲话压低。
- 原九案、58 个储备主题、规则与存档兼容。音乐来源和许可在 `NOTICE.md` 与 `art/source/music/` 中。

## 推源码与发压缩包是两件事

### 推源码

将**项目根目录作为 Git 仓库根目录**，而不是父目录 `TESTBMK/`，也不要只推 `src/forum_system/`。本次检查时目录没有 `.git` 或远程地址；没有替用户初始化、commit、连接远程或 push。

`.gitignore` 已排除：

- 根/前端研究抓取、历史备份；
- `releases/` 中的 ZIP、校验边车、历史包及临时解压目录；
- Python 缓存、node_modules、环境文件、系统杂项；
- 临时测试截图/存档/结果、日志、Blender 自动备份和旧调试探针。

**必须保留**运行资产（含音乐/语音/Three.js）、`data.js`、`cases/catalog.json`、案卷库、源码、美术可重建源、测试和许可说明。忽略规则不会排除这些必要文件。

在你已有的目标 Git 仓库中提交前检查 `git status --short` 和 `git add -n .`，确认远程仓库正确后再自行提交。若目标仓库之前已经跟踪了缓存/备份，新增 `.gitignore` 不会自动取消跟踪，需要单独检查；本次未删除你的历史文件。

### 发离线包

最新提交整理包：

```text
releases/awesome-chinese-folk-game-v6.2-source-ready.zip
releases/awesome-chinese-folk-game-v6.2-source-ready.zip.sha256
```

`source-ready` **不是新玩法版本**：游戏代码、画面、语音、音乐与此前 V6.2 preview 完全相同，只修正版本说明、Git 忽略和包验证工具。V6.2 preview / V6.1 / V6.0 原包均保留不覆盖。包内有 `FREEZE-MANIFEST.json`；源码提交不需要把所有历史 ZIP 推进 Git，若发 Release 可单独上传最新 ZIP 与校验边车。

## 检查记录与复验

2026-09-21 最终目录检查：V6.2 原包的 260 个载荷文件在检查开始时与工作目录对应文件逐项一致；本次整理不改运行文件。9 份规范案卷 + data.js + engine.js + config.js 共 12 个保护哈希保持一致。

版本整理前的全量游戏回归 **12 个阶段通过**，见 [V6.2 验证](music-v6.2/README.md)。本次复验 Python 单元测试、规则引擎与内容完整性，并使用最新 ZIP 的独立临时解压目录运行启动器和浏览器验收，不只验证工作目录。使用临时 Git 索引模拟忽略规则，不触碰项目的 Git 状态；常见密钥特征检查未发现命中，但不等于完整安全审计。

```sh
# 在项目根目录执行
python3 main.py --check
python3 -m unittest discover -s tests -v
node tests/engine.cjs
node src/forum_system/tests/content-integrity.cjs

# 默认包名与版本读 CURRENT_VERSION.json；拒绝覆盖内容不同的同名旧包
python3 tools/package_release.py

# 用全新解压目录，核对整包/逐文件 SHA-256，然后实测 HTTP 和 file://
# 需要 Playwright 与 Chrome，可设置 PLAYWRIGHT_PATH、CHROME_PATH
node tools/verify_package.cjs
```

包验收包括当前版本、游戏静态资源、CC0 音乐加载、无环境噪声源、音乐独立关闭、夜读回看、实际旁读播放、收录线索和刷新后的存档持久化。使用端口 4187；临时目录和独立浏览器结束后清理，不覆盖玩家日常存档。

**公开发布边界不变**：本次只确认文件与版本。BGM 的 CC0 不等于整个仓库取得统一开源/商用许可，TTS 和参考主题的权利说明仍需遵守 `NOTICE.md`。
