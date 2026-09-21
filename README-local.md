<div align="center">

# Awesome Chinese Folk Game
### 未明旧案柜 · 入夜，再查

**当前源码：V6.2.0-preview · 本仓库根目录就是最新版本。**  
[版本标识](CURRENT_VERSION.json) · [提交前检查 / 目录说明](docs/publish-check.md)

**离线论坛推理游戏 × 可扩展民俗悬疑资料库**  
**9 个可玩案卷 · 58 个储备主题 · 12 幅预渲染现场**

[开始游玩](#开始游玩) · [完整案卷目录](docs/case_list.md) · [玩法手册](docs/game_manual.md) · [English](#english)

![未明旧案柜封面](assets/cover_banner.png)

</div>

> 放下去六盏，飘回来七盏。  
> 有人在一张被裁掉的报纸里，等了六年。

这不是一张游戏宣传页。你会真正进入帖子、留下追问、私信相关人，走进线索指向的现场，再把互相矛盾的材料拼回同一个夜晚。我们不替传闻作证，先替没能留下名字的人保管证据。

仓库由原 `wanxiang-forum` 整理而来，保留 V3 的独立旧案与 V4《寄名簿》连续主线。人物、案件和画面不使用《頭七》的角色、剧情或资产；不采用通用营销网页模板。

## 开始游玩

```sh
# 进入下载或解压后的项目根目录
cd awesome-chinese-folk-game
python3 demo/run_demo.py
```

Python 3.9+，**无需 pip 安装、账号、后端数据库或 API Key**。自动打开 **http://127.0.0.1:4173/**。正式入口也可用 `python3 main.py`。

没有 Python？直接打开 **`src/forum_system/index.html`**，保留完整 `src/` 目录即可离线玩。更多方式见 [安装指南](docs/install_guide.md)。

- 第一次玩：从《借灯人》的求助帖开始。
- 想进入连续故事：顶栏 **案卷 → 寄名簿 → 灯灭之前**。
- 想接着旧存档：使用原来的主机名与端口；改路径或浏览器前，在设置中**导出整柜**。

## V6.2 Preview · 去掉底噪，留下钢琴（当前工作版）

- **已删除持续的雨声、风声、水滴与电流声合成层**，不再把白噪声当作 BGM。
- 改用 **Emma_MA 的 [Haunting piano](https://opengameart.org/content/haunting-piano)**：源录音页面标注 CC0，并明确声明录音进入公有领域。保留许可文本、来源与原始文件哈希；不是把“免费下载”当成版权许可。
- 钢琴曲已本地打包，做低响度处理与循环交叉淡化；切页不断曲，讲话时自动压低。不联网串流、不加载第三方播放器。
- 「存档 / 设置」有 **BGM 独立开关与音量**。关音乐后仍可听到旁读、磁带、翻页、收录等声音；顶栏「声音」仍是全部声音总开关。
- 原存档兼容，默认总声音仍关闭。直接打开 HTML 也可离线播放。V6.0 / V6.1 发布包保持不动。

[来源、改动与验证](docs/music-v6.2/README.md) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) · [本地音乐文件](src/forum_system/assets/music/haunting-piano-loop.mp3)

## V6.1 Preview · 夜读演出

在 V6 的完整游玩界面上，新增一层**与原文对应、可收起的叙事演出**：

- **六组原创 SVG 意象**：河灯轻摆、信纸展开、烛火呼吸、六盏电灯缓暗复亮、镜中淡影、幕布剪影；不靠随机贴脸或尖叫制造紧张。
- **11 个关键帖子片段**覆盖九案；每段自动演出一次，至少间隔 90 秒，每次打开游戏最多 3 段。自动片段 5.2 秒收起，也可手动回看，不挡住导航或要求等待。
- **13 段本地原文 TTS**：11 段帖子、2 份已收录线索；带文字、暂停/续播、重播、音量及语速。旁读嵌在演出内，收起后成为独立播放器，避免弹窗堆叠。
- **节奏与安全感**：默认轻柔、静音、关闭自动旁读；可选微恐/关闭。减少动态时不自动演出；切页、静音、进入后台停止旁读。原剧情、答案、取证顺序及旧档不变。

体验：打开《借灯人》的河灯帖，或「案卷 → 灯灭之前」的首帖。声音需要主动开启；「存档 / 设置 → 夜读演出与旁读」可选择微恐和自动旁读。已经看过的片段用「重看片段」再次查看，不必清除存档。

[演出设计与验收](docs/narrative-v6.1/README.md) · [桌面实拍](docs/narrative-v6.1/voice-desktop.png) · [手机尺寸实拍](docs/narrative-v6.1/voice-mobile.png)

语音是本地系统 TTS 预演，不是全篇配音或演员演出；正式公开/商用前需核验系统音色分发权利，见 [NOTICE](NOTICE.md)。V6.0 历史发布包保持不动。

## V6 Preview · 档案电影感

**保留九案原玩法，升级实际游玩界面，而非只改首页。**

- 现场退出终端侧框；《灯灭之前》新增点验厅、墙后走廊两套独立镜头与灯台近景。
- 灯台提供可选的本地实时 3D 结构查看；静态图、原始观察和取证始终可用。
- 调查手记新增双证据原文对照、来源信息、固定关联工具条。
- 切页、首次入场、收录、归档反馈统一；保留阅读/私信滚动位置，默认静音并尊重减少动态。
- 其他案卷获得统一视觉、排版、交互升级；并未宣称全部场景完成 3D 重制。

[本轮交付与验证](docs/visual-v6/README.md) · [现场截图](docs/visual-v6/02-hall-desktop.png) · [证据工作台](docs/visual-v6/05-comparison-desktop.png)

直接打开 HTML 仍可离线游玩；3D 物件查看请使用上述 Python 本地启动器。V5 冻结包保持不动。

## V5 · 灯下旧档（视听更新）

这一版不扩写剧情、不调整谜题或解锁条件，只让夜班更有质感：

- **旧论坛仍是游戏本身**：褪色朱砂、旧铜边框、纸张纤维与布面手记；现场照片随案卷变化，不使用通用宣传页模板。
- **十二幅 1920×1200 本地现场**：重做木纹、墙面风化、潮湿石面与冷暖光照，保留原有证据位置。
- **分场景声场**：论坛的细雨、旧屋的漏风、井院水滴、雪夜风声、空戏台的穿堂风；切换地点平滑混音。轻量翻页、收录、私信和推理反馈音由本地 Web Audio 合成。
- **可控而不打扰**：默认关声音；总音量 / 环境声 / 操作音分别可调。录音播放时环境声降低，切到后台自动静音。支持减少动态，无爆音、闪屏与贴脸惊吓。

已有 V1 / V3 / V4 存档继续使用相同键名。保持原来的浏览器地址即可接着玩。[更新、素材与验收说明](docs/immersion-v5.md)

## V5 冻结基线

冻结前逐文件检查、最小修正与验证方法见 [冻结报告](docs/freeze-v5.0.md)。本地冻结包另存为 `releases/awesome-chinese-folk-game-v5.0-freeze-20260918.zip`，不覆盖已有 V5 / V4 / V3 历史包。包内含逐文件 SHA-256 清单，包外有整体校验文件；此处不是 Git tag，也未上传远程。

## 真正的调查循环

**读帖 → 标记证据 → 私信核验 → 实地取证 → 配对并解释 → 回访复勘 → 报告归档**

- 续帖和第二处现场由证据、推断解锁，不是一屏全部摊开的素材。
- 连续案的配对不只“选中即通过”：必须说明两份材料支持什么；误判有反馈，可修正。
- 时间、镜位、邮路与授权各用不同核验，不把每案都做成同一把密码锁。
- 公开或暂缓公开影响下一夜的交接说明，两条路径都可继续，不靠造假解锁“好结局”。

![实际游玩步骤节选](assets/preview_gif.gif)

<sub>GIF 为真实操作过程的关键帧节选，省略阅读与等待时间，不是完整实时录像。</sub>

## 九个可玩案卷

| 案卷 | 主题与调查方向 | 关系 |
|---|---|---|
| 001 · 借灯人 | 河灯、旧闻、被漏记的人 | 独立旧案 |
| 002 · 空轿照夜 | 阴亲与古宅 | 独立旧案 |
| 003 · 铃过无名关 | 归乡路引与身份 | 独立旧案 |
| 004 · 年夜缺席 | 守岁与空席 | 独立旧案 |
| 005 · 最后一折 | 水乡阴戏与旧事 | 独立旧案 |
| 006 · 灯灭之前 | 命灯、隔墙听声、被改写的死期 | 寄名簿 · 第一夜 |
| 007 · 镜中无籍 | 旧镜、寄名衣物、身份记录 | 寄名簿 · 第二夜 |
| 008 · 井底回邮 | 封井、镇石、一封信的真实邮路 | 寄名簿 · 第三夜 |
| 009 · 归宗空席 | 归宗、层叠封存、更正与授权 | 寄名簿 · 第四夜 |

《寄名簿》每夜 **8 篇帖子 / 12 份线索 / 6 条解释 / 2 处现场 / 1 个核验谜题 / 2 种归档方向**。后续案随前案归档开放。每夜 35–50 分钟是创作时估算，未做真人游玩时长标定。

<details>
<summary>查看真实界面截图（结局图另置，默认不展示剧透）</summary>

### 夜班论坛
![论坛首页](assets/screenshots/forum-home.png)
### 实地调查
![现场调查](assets/screenshots/investigation.png)
### 证据手记
![线索手记](assets/screenshots/evidence-board.png)

[反转结局截图（剧透）](assets/screenshots/ending-spoiler.png)

</details>

## 58 个主题，不冒充 58 个成品

用户提供的两批方向去重后为 **28 + 30 = 58**。每个方向一篇 Markdown，无数字前缀，便于长期扩容。

每篇包括：民俗设定、现场疑点、关键线索、拼图逻辑、折叠反转、玩法衔接建议和开发风险。保留参考意图，但指出“定时毒效”“读取记忆”“后代继承罪责”等逻辑或表达问题，避免机械堆砌。

- [传统民俗参考](cases/classic-folk-cases/)：阴亲、赶尸、风水、阴戏、狐仙、童谣等 28 项。
- [新收集参考](cases/exclusive-folk-cases/)：命灯、寄名、古镜、封井、夜巡、归宗等 30 项。
- [完整目录](docs/case_list.md) / [机器可读目录](cases/catalog.json)。

**`planned` 只代表写作储备，不出现在可玩案卷柜。** `exclusive` 是分类名，不是独家版权声明。参考标题、民俗与医疗机制未经独立核实，资料是结构化摘要而非聊天逐字备份。

## 项目结构

```text
awesome-chinese-folk-game/
├── demo/                       # 一键体验入口与说明
├── src/
│   ├── forum_system/           # 原论坛前端、运行 assets、美术源稿、测试
│   ├── case_engine/            # 证据门槛、解释判定、存档标准化
│   ├── folk_parser/            # 读取 cases，校验并编译离线快照
│   └── utils/                  # 路径、配置与本地服务器
├── cases/
│   ├── classic-folk-cases/     # 28 篇待开发主题 Markdown
│   ├── exclusive-folk-cases/   # 30 篇待开发主题 Markdown
│   ├── playable/              # 9 案元数据与可执行 JSON 剧情
│   ├── authoring/serial/      # 连续四案创作源
│   └── catalog.json           # 自动生成的全库目录
├── assets/                    # 仅用于仓库展示：封面 / 截图 / GIF
├── docs/                      # 安装、玩法、目录与迁移说明
├── tools/                     # 发布打包与展示素材生成
├── tests/                     # 库解析和共享引擎单元测试
├── releases/                  # 本地发布包与历史版本，不提交二进制
├── requirements.txt           # 运行只依赖 Python 标准库
└── main.py                    # 正式入口
```

**两个 assets 各司其职**：游戏读 `src/forum_system/assets/`；README 读根 `assets/`，相互不依赖。十二幅现场在 V5 中以 1920×1200 重新渲染，使用项目自建 Blender 场景与程序材质，附 [美术源稿](src/forum_system/art/README.md)。

旧 `chapters/` 不再维护剧情，`data.js` 是自动生成且随项目提供的离线快照。详见 [迁移说明](docs/repository_migration.md)。

## 扩写与测试

```sh
python3 -m src.folk_parser check       # 检查格式、引用与推理图
python3 -m src.folk_parser build       # 更新离线数据与目录
python3 -m unittest discover -s tests # 库单元测试
node tests/engine.cjs                 # 引擎单元测试
python3 tools/package_release.py --output releases/my-build.zip  # 新文件名，不覆盖冻结包
```

新增可玩本必须有独立的人物、时间线、伏笔、失败反馈和完整通关验证，不只是把一个参考条目改成 `playable`。详细流程见 [剧本库说明](cases/README.md)。浏览器测试命令见 [安装指南](docs/install_guide.md)，历史迁移结果见 [V4.1 验收](docs/validation.md)，当前音频改版和回归结果见 [V6.2 说明](docs/music-v6.2/README.md)。

## 内容、存档与授权

- 建议 16+。游戏含死亡、失踪和心理压迫，无血腥图片和贴脸惊吓；储备主题更沉重，请留意各篇内容。
- 音效默认关闭，关键音频均有文字。支持键盘、移动端热点按钮与关闭动态效果。
- 全部进度留在当前浏览器，没有追踪。换来源或清除浏览器数据前请导出存档。
- **尚未选择统一开源许可证**。参考资料不等于第三方改编授权；正式公开发行前需确认各类内容权利。[授权与来源说明](NOTICE.md)

---

## English

### A playable archive, not a landing page

**Awesome Chinese Folk Game / 未明旧案柜** is an offline, Chinese-language folk-horror investigation game. Read forum threads, interview fictional users through private messages, examine scenes, connect evidence and explain your deductions before filing a report.

The repository contains **9 playable cases**: five standalone mysteries plus the four-part **Register of Borrowed Names** cycle. The separate **58-theme Markdown library** is a writing reference collection, **not 58 additional playable games**. All gameplay text is currently in Chinese; this README is bilingual, not the game itself.

### Quick start

```sh
python3 demo/run_demo.py
# or
python3 main.py --no-browser
```

Python 3.9+, standard library only. The launcher validates the case library and opens `http://127.0.0.1:4173/`. For a server-free offline session, open `src/forum_system/index.html` while keeping the full `src/` directory intact.

### Current version: V6.2 Preview

The project root is the current source. See `CURRENT_VERSION.json` for version and latest local archive paths. V6 cinematic presentation and V6.1 SVG cutaways/local narration are included. V6.2 removes all continuous rain/wind/water/hum layers and uses **Haunting piano by Emma_MA (CC0)** as local instrumental BGM. Music has independent volume/on-off controls and ducks under narration/tapes. Sound remains off by default; no music service or runtime API is required. See [music provenance and validation](docs/music-v6.2/README.md).

### Authoring architecture

- `cases/`: canonical theme Markdown, playable JSON and serial authoring sources.
- `src/folk_parser/`: metadata parsing, reference and reachability checks, deterministic offline compilation.
- `src/case_engine/`: shared evidence gates, inference checks and save normalization.
- `src/forum_system/`: the existing playable UI and in-game assets.
- Root `assets/`: repository presentation only; screenshots are captured from the game.

Run `python3 -m src.folk_parser build` after editing content. Planned themes are indexed but never silently registered as playable cases. See the [case catalog](docs/case_list.md) and [installation guide](docs/install_guide.md).

### Scope and provenance

The existing narrative is preserved during this repository migration. Browser saves retain their keys, but moving between file paths, hosts, ports or browsers may require export/import. The game does not use characters, dialogue, plot or artwork from *頭七* and is not affiliated with its creators.

Folklore and mechanisms are fictional writing prompts, not ethnographic or medical claims. The folder name `exclusive-folk-cases` does not imply exclusive rights. A blanket open-source license has **not** yet been chosen; review [NOTICE](NOTICE.md) before redistribution or commercial use.
