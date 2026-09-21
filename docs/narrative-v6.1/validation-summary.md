# V6.1 最终验证记录

日期：2026-09-21。工作树直接运行，隔离的 Playwright Chromium 配置，不读写玩家浏览器存档。

## 自动化结果

| 项目 | 结果 |
|---|---|
| `npm run test:all`，11 个阶段 | 全部通过 |
| 内容完整性 | 9 个可玩案卷、58 个储备主题；规范内容引用通过 |
| 原有首案/四独立案/连续四夜 | 流程、门槛、错误答案、关联、两种归档与存档回归通过 |
| 响应式与既有交互 | 40 个游戏视图 + 8 个设置弹窗；焦点、草稿、滚动、全屏、旧档兼容通过 |
| V5 声场 / V6 3D 与现场 | 原有静音/混音/后台、物件查看/失败回退/释放、取证与对照通过 |
| V6.1 夜读演出 | 默认无音频预加载；自动不抢焦点；每段一次、90 秒冷却、每次打开最多 3 段；手动及定时退出通过 |
| V6.1 旁读 | 实际 Audio 播放/暂停/续播/重播/停止；单通道；环境声压低；总音量相乘、零音量及语速通过 |
| V6.1 门槛与生命周期 | 仅已收录线索展示旁读；弹窗内首次启用声音；切页/静音/后台/失败回退；旧磁带环境声压低不受空闲旁读影响 |
| V6.1 布局 | 320×640、390×844、768×1024、844×390；演出与集成播放器不互相遮盖、不出视口，按钮至少 44px（测量容差 1px） |
| 本地音频资产 | 13 段原文逐段匹配、哈希/时长一致；解码有限数值、有非零信号、峰值未削波；合计约 97.8 秒、1.13 MiB |
| 离线 | file:// 实际旁读播放通过，无外部服务请求 |
| Python unittest | 12 项通过 |
| 共享规则引擎 | 门槛、推断、存档标准化、继承属性拒绝通过 |
| `python3 -m src.folk_parser check` | 9 playable / 58 planned 通过 |
| 保护文件 | 9 份 case.json、data.js、engine.js、config.js 的 12 个 SHA-256 与 V6 改造前基线一致 |
| V6 历史包 | SHA-256 仍为 `89ae0dfa7ba9d8677829ee205b17465819890eb02c0bf28665bbd2c1df4ff2e5`，未覆盖 |

附加浏览器检查：滚动取消等待中的片段；手动片段在 5.6 秒后仍保留；Escape 返回回看按钮。运行日志合并在 `validation-output.txt`；专项结构化记录见 `verification.json`。

## 复现命令

```sh
PLAYWRIGHT_PATH=/path/to/installed/playwright \
GAME_URL=http://127.0.0.1:4176 \
npm --prefix src/forum_system run test:all
python3 -m unittest discover -s tests -v
node tests/engine.cjs
python3 -m src.folk_parser check
```

测试的 ffmpeg/ffprobe 用于解码与时长校验，不是玩家依赖。Playwright 默认 Chrome 路径可用 `CHROME_PATH` 覆盖。

## 已知边界

- 这是可试玩的 V6.1 Preview，不是经过真人盲测或商用音源授权审查的最终发行版。
- Chrome + 移动视口模拟；没有宣称 iOS Safari、Android 真机、帧率/耗电或读屏软件验收通过。
- 有解码和播放验证，但没有把它称作人工听感验收。系统 TTS 不是专业角色配音；正式发行需检查许可或更换已授权音源。
- SVG 演出是象征性阅读画面，不是新增 3D 场景、真实民俗复原或新线索。旧规则和答案没有修改。
