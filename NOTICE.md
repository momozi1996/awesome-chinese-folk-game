# 内容、资产与授权说明 / Provenance & permissions

- 游戏中的人物、对白和案件为本项目创作的虚构内容；参考的是论坛调查这一形式，不隶属《頭七》及其开发者。
- `cases/classic-folk-cases/` 与 `cases/exclusive-folk-cases/` 是用户提供的参考方向的结构化归档。标题与情节可能与既有作品有关，尚未完成第三方权利核验；不声称原创、独占或取得改编许可。
- 游戏场景为项目已有的程序夜景及 Blender 预渲染；建模、材质和灯光源在 `src/forum_system/art/source/`。界面图标为本项目绘制。V5 纸张与布面纹理由本地 Python 程序生成；V5 的环境声与操作音由 `soundscape.js` 在浏览器合成；V6.2 已删除持续环境噪声，改用下文记录的 CC0 钢琴曲，操作音保留本地合成，无 CDN。首案磁带沿用项目已有的原创文本与系统中文语音处理资产，其分发权利仍需发布者确认。来源与重建方式见游戏「关于」及美术说明。
- 展示封面组合本项目现有场景与标题；截图来自真实运行界面；GIF 是实际游玩步骤截图拼成的节选，不是整段实时录像。
- `research/` 中抓取的参考资料与测试下载不进入游戏运行路径或发布压缩包。

**授权状态：本仓库尚未选定统一开源许可证。公开源码不自动等于允许商业使用、再分发或改编所有素材。** 发布者正式发布前应分别确认代码、可玩故事、参考主题及语音素材的权利，再添加合适许可证。这里不代第三方授予任何权利。

The repository currently has no blanket open-source license. User-supplied reference themes are not claimed as exclusive IP. Public source availability alone does not grant redistribution, commercial-use or adaptation rights. Review provenance and choose appropriate licenses before a public release.


## V6 新增资产与依赖

- `src/forum_system/vendor/three.module.js`：Three.js **r160**，沿用本地已有的标准发行模块；Copyright © Three.js authors，按 MIT 许可证分发，完整文本见同目录 `LICENSE.three.txt`。此许可证仅覆盖 Three.js，不代表本仓库其余内容已获统一授权。
- `src/forum_system/art/source/v6/build_cinematic.py`、三份独立 `.blend` 与 `assets/scenes-v6/`：本轮程序化建模、材质与灯光渲染，复用项目 V5 构造辅助函数，无外部模型、贴图或 AI 位图服务。
- `presentation/inspector.js`：程序化铜盏/电珠/接线结构示意与本地生成表面纹理，不是文物测绘或新增剧情证据。
- V6 截图来自隔离测试存档下的真实浏览器运行；不是概念稿，也不等于真实移动设备测评。

## V6.1 夜读演出与旁读

- `presentation/narrative-art.js`：本轮绘制的程序 SVG，灯笼、蜡烛、信件、六盏电灯、古镜及戏台剪影六组意象。无第三方图片/模型，不是文物复原或额外剧情证据。
- `assets/voice-v6/`：13 段**本地预生成系统中文 TTS**，逐字节选自已有可玩案卷（11 段帖子、2 份线索），非现场或演员录音。未克隆、模仿或指认任何真人身份；未请求麦克风、上传文本或调用远程语音服务。
- 生成使用 macOS `/usr/bin/say` 的 `Tingting` 与 `Eddy (中文（中国大陆）)` 系统音色，FFmpeg 进行低切/高切、响度处理与 MP3 编码。脚本、文本出处、段落编号、时长、音色名及文件哈希见 `src/forum_system/art/source/narrative/`。运行预览不需要这些生成工具。
- **系统音色的公开再分发及商业使用权利尚未核验。** 当前交付是本地预览，不构成语音资产的商用授权。正式公开发行前，发布者应核验对应系统/音色许可，或用已获授权的 TTS/配音重新生成这些原文节选，并更新清单与哈希。本仓库没有因此获得统一开源许可。
- `docs/narrative-v6.1/` 的截图来自真实浏览器及隔离测试存档；移动端为尺寸模拟。音频校验是实际解码、信号/峰值与播放进度测试，不等同人工听感验收或手机真机测试。


## V6.2 背景音乐（仅本曲按 CC0 使用）

- **作品/录音**：*Haunting piano*，**Emma_MA**，2017-01-07 发布于 OpenGameArt。
- **原始来源**：https://opengameart.org/content/haunting-piano
- **源录音文件**：https://opengameart.org/sites/default/files/haunting%20piano_0.mp3
- **许可**：[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)。于 2026-09-21 实际读取来源页面，其 License(s) 为 CC0，Copyright/Attribution Notice 明确写有：**“This track has been released into the public domain as of January 2017.”**
- 在该 CC0 声明下，本录音可以复制、修改、商业使用及再分发，无强制署名要求；项目仍保留作者和来源。不是只核验古典“乐谱”的公有领域，也不是从“免费下载/royalty-free”的标签推断录音许可。
- **本地处理**：裁去头尾静音、-25 LUFS / -6 dBTP 响度处理、1 秒循环交叉淡化、44.1 kHz 双声道 MP3 编码；没有加雨声、风声、嘶声或其他采样。
- 原音频、页面许可声明摘录、完整 CC0 法律文本、SHA-256 与可重建脚本在 `src/forum_system/art/source/music/`。可播放的本地文件在 `assets/music/haunting-piano-loop.mp3`；`music-data.js` 是同一 MP3 的 Base64 离线传输副本，不是另一首曲子。
- 完整网页抓取仅保存在研究目录，不随发行包分发。本项目没有独立验证作者所有上游权利；CC0 本身也不提供权利担保。**本曲的 CC0 不覆盖本项目其他内容，尤其不改变前述 TTS 语音、参考主题及整体许可证的边界。**
