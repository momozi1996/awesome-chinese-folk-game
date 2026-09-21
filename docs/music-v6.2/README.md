# V6.2 · 去掉白噪声，改为悬疑钢琴

## 已实施

1. 删除 `soundscape.js` 中持续循环的 rain / air / water / hum 四个环境声源及对应构造函数。它们不是静音后藏在后台，运行时根本不创建。
2. 保留翻页、点选、收录、私信、推理反馈、原磁带及 13 段旁读。纸页操作仍有短暂的摩擦音，但不循环、不成为环境底噪。
3. 背景改为一首本地钢琴曲 **Haunting piano — Emma_MA**，不加噪声层。
4. 「存档 / 设置」改为游戏声音总开关、总音量、**BGM 独立开关和音量**、操作音及原旁读设置。BGM 可彻底关闭，其他声音独立工作。
5. 旧 `ambience` 音量字段映射为音乐音量以兼容旧档，新增可持久化的 `music` 布尔开关；不改案件状态、谜题或规范案卷文件。

## 实时查到的许可

查询日期：2026-09-21。

| 作品 | 页面作者与许可 | 选择 |
|---|---|---|
| [Haunting piano](https://opengameart.org/content/haunting-piano) | Emma_MA；CC0；作者明确写录音已于 2017 年 1 月进入公有领域 | 本版采用，作者定位为幽灵/悬疑感钢琴 |
| [Vampire's Piano](https://opengameart.org/content/vampires-piano) | TAD；CC0；dark fantasy、sad piano，作者称可循环 | 找到但未接入 |
| [Mystical Piano](https://opengameart.org/content/mystical-piano) | Indieteur；CC0；calm / meditative instrumental | 找到但未接入，更偏平静 |

这里的“无版权顾虑”具体落到 **CC0 1.0**：来源页对这份录音的公开声明允许复制、改编、商用、再分发，无强制署名。仍主动记录作者、来源和许可文本，不承诺整个游戏都因此可无条件商用；旧 TTS 资产的分发权利核验事项不变。

本曲原始录音约 58.4 秒。本地循环版约 52.85 秒：去头尾静音、降低响度、1 秒跨边界交叉淡化。曲目选择依据作者的音乐描述与授权声明；本轮完成了解码/波形/浏览器信号测试，**没有将这些测试称为人工听感评审**。

## 播放工艺

- 复用唯一 Web Audio Context；一个音乐 BufferSource，通过音乐独立总线混合。不新增第二个长期运行的声音系统。
- 主动开声音、BGM 开启且音量非零后，才加载本地 `music-data.js`、解码 MP3。初始静音或保存的 BGM 关闭状态不下载/解码音乐。
- Base64 仅为 classic script 的离线传输方式；HTTP 和 file:// 使用同一录音字节，避免 file:// 的 fetch / MediaElementSource 跨域静音问题。原始 MP3 仍单独提供试听。
- 切页/切案保持音乐，不重新从头播放；恢复播放保存的位置并软起音。
- 旁读/磁带讲话时音乐降到当前音乐总线的 18%，暂停/结束后恢复。
- 总静音、BGM 关闭、任一相关音量归零立即停掉音乐源；后台 suspend，返回时只有声音和 BGM 都开启才恢复。
- 异步加载完成不能擅自解除静音；失败显示重试，其他声音与解谜继续可用。

## 文件位置

- `src/forum_system/soundscape.js`：移除白噪声环境、接入音乐及原操作音总线。
- `src/forum_system/app.js` / `immersion.css`：BGM 控制、准确的声音标签、存档兼容。
- `src/forum_system/assets/music/haunting-piano-loop.mp3`：运行用循环曲。
- `src/forum_system/assets/music/music-data.js`：按需加载的同源录音离线副本。
- `src/forum_system/art/source/music/`：原录音、许可摘录、CC0 法律文本、`manifest.json` 与 `build_music.py`。
- `src/forum_system/tests/music-v6.cjs`：音乐/底噪移除专项测试。

重建只需 FFmpeg（不是玩家依赖），不请求远程服务：

```sh
python3 src/forum_system/art/source/music/build_music.py
```

本次工作前备份位于 `src/forum_system/backups/v6.1-before-music-v6.2.zip`，不进入发布包。V6.0 / V6.1 历史发布 ZIP 不覆盖。

## 体验与验证

当前开发入口：**http://127.0.0.1:4176/**。刷新后开启顶栏声音。

- 只想保留旁读和操作音：设置 → 悬疑钢琴 BGM → 关闭。
- 想保留音乐但更轻：调低 BGM 音量，不用降低总音量压掉人声。
- 离线试听本曲：`src/forum_system/assets/music/haunting-piano-loop.mp3`。
- 继续旧档请保持原来的浏览器地址；无需清空任何存档。

```sh
PLAYWRIGHT_PATH=/path/to/playwright GAME_URL=http://127.0.0.1:4176 \
  npm --prefix src/forum_system run test:all
python3 -m unittest discover -s tests -v
node tests/engine.cjs
python3 -m src.folk_parser check
```

专项结果：[verification.json](verification.json)。包含零持续噪声源、真实钢琴解码信号、关闭音乐后的数字静音、其他声音保留、单音乐源、讲话压低、循环边界、后台/静音/延迟加载、失败重试、独立开关持久化、file:// 实际信号、320/390/844 像素视口。

原 V5 回归中“四个持续环境声源”和“隔窗细雨标签”的断言，按本次明确需求改为零环境声源、一个音乐源、真实钢琴信号；其他混音/磁带/操作音等断言保留。移动端无障碍标签断言同步为“开启游戏声音”。没有通过删除旧功能测试来掩盖回归。

截图：[桌面设置](settings-desktop.png) / [手机设置](settings-mobile.png)。Chrome 与浏览器尺寸模拟，不代表 Safari/Android 真机或人工听感验收。

### 最终回归结果 · 2026-09-21

- `npm run test:all` **12 个阶段全部通过**，含原有九案完整流程、视口/设置、旧档、V5 混音、V6 3D、V6.1 演出旁读与本轮音乐专项。
- Python **12 项单元测试通过**；共享引擎和内容解析器通过（9 playable / 58 planned）。
- 12 份受保护的剧情/规则/配置文件 SHA-256 与 V6 前基线一致；V6.0 和 V6.1 发布包的 SHA-256 与各自校验文件一致，未覆盖。
- 关闭 BGM、BGM 音量归零、总音量归零时，专项分析器均测得 **RMS=0 / peak=0**（等待短操作音结束后）；保留旁读和操作音功能。
- 测试原始输出见 `validation-output.txt`。截图和解码信号是实际测试产物，不代表人工音乐审美或真机验收。
