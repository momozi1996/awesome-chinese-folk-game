# V6 Preview · 档案电影感

本轮是**呈现层改造**，不是新剧情、新谜题或全 3D 行走游戏。保留九案玩法、所有答案与解锁顺序、原存档键。基线备份保存在 `src/forum_system/backups/v5-before-cinematic-v6.zip`（不进入发布包）。

## 设计合同与实际交付

| 层次 | 本轮改动 | 边界 |
|---|---|---|
| 论坛 / 阅读 | 冷调夜班终端、减轻边框、加大正文、控制阅读行宽、帖子留白 | 保留论坛信息架构，不改内容 |
| 勘验现场 | 退出侧栏/终端框、完整图像与等比例热点、独立地点页签、触屏物件列表 | 预渲染定点勘验，不宣称自由漫游或实时全场景 3D |
| 重点美术 | 《灯灭之前》点验厅斜向桌面构图、墙后走廊纵深构图、灯台近景；六个电珠与共同接线 | 其余现场沿用 V5 原图，获得共同 UI/交互升级，尚未逐一重做美术 |
| 物件 3D | 灯台铜盏、电珠、接线结构示意；拖动、方向按钮/方向键、Home/按钮复位 | 明确标为复原示意；不要求旋转取证，不补充谜底；文字为准 |
| 手记 | 双证据全文对照、来源信息、固定关联工具条、原有已确认脉络 | 不自动配对、不替玩家解释、不改关联判定 |
| 转场与反馈 | 180ms 页面淡入、280ms 现场切换、首次勘验 1.1s 可跳过入场、400ms 收录卡、650ms 归档落印 | 不阻塞输入；先更新状态再表现；不添加闪屏、晃动正文或强制等待 |
| UE / 无障碍 | 分视图阅读位置记忆、私信滚动位置保留、移动主要导航/热点 44px、键盘焦点、系统减少动态优先 | PC Chrome 和浏览器设备尺寸模拟，不等于真机/iOS/Safari 验证 |
| 性能 / 离线 | 稳定终端和 content 根节点；3D 点击后才加载、按需渲染、DPR≤1.5、关闭释放 GPU 与监听器 | DOM 内容片段仍会重绘，不声称已完全组件化；没有持续空转 3D 循环 |

## 体验路线（无额外剧透）

1. 启动后顶栏「案卷」→《灯灭之前》。
2. 按原有流程读帖取证、向联系人确认地址，进入「现场」。
3. 点验厅 →「灯台接线」→ 可选「开启 3D 查看」→ 收录现场记录。
4. 打开「手记」，点选两份材料，查看并排原文，再按原规则建立关联。
5. 随剧情解锁墙后走廊，体验第二个镜头与场景切换。

不为展示新美术绕过地点许可或提前泄露第二现场。`tests/cinematic-v6.cjs` 使用隔离的测试存档截取 UI；完整实际游玩验证由原九案测试负责。

## 启动

```sh
python3 main.py                      # 默认 127.0.0.1:4173
python3 main.py --port 4176 --no-browser  # 端口被占时的示例
```

**继续旧档应保留原主机名、端口、浏览器。** 换端口前导出整柜再导入。直接双击 `src/forum_system/index.html` 仍能游玩；file:// 下 3D 使用静态图回退，不尝试跨文件模块导入。默认关声音，保留 V5 声场与音量控制。

## 工程位置

- `src/forum_system/presentation/cinematic.js`：视图生命周期、纯展示映射、转场/收录卡、对照台、3D 管理。
- `src/forum_system/presentation/cinematic.css`：V6 最后加载的独立视觉层；保留历史 V5 CSS。
- `src/forum_system/presentation/inspector.js`：本地 Three.js 物件查看器；不是规则引擎。
- `src/forum_system/assets/scenes-v6/`：三幅 1920×1200 原创预渲染图。
- `src/forum_system/art/source/v6/`：可重建脚本及三份独立 `.blend` 场景。
- `src/forum_system/vendor/`：Three.js r160 与 MIT 许可证，无 CDN。
- `content-baseline.json`：9 份 case.json + data.js + 规则引擎 + 配置的改造前 SHA-256。

美术重建（需 Blender 5，可选 Metal，失败则 CPU）：

```sh
blender --factory-startup -b --python src/forum_system/art/source/v6/build_cinematic.py
```

脚本复用 V5 几何/材质辅助函数，不执行 V5 批量渲染；固定随机种子，无外部模型/字体/贴图。体积光、光追实时渲染、镜头自由移动、专业手工高模不在本轮交付范围。

## 降级与生命周期

- 关闭「设置 → 物件 3D」后只保留静态近景与文字。3D 是按次主动开启，不自动启动。
- 模块加载失败、WebGL 创建失败/上下文丢失均不删除正文与收录按钮。
- 关闭弹窗/切换页面使异步挂载 token 失效；已创建 renderer、材质、几何、纹理、ResizeObserver 与事件监听器被释放。
- 新场景图片加载失败回退原图，**同时恢复原图热点坐标**。
- 系统减少动态或游戏中关闭动态时，不播放新转场；手动旋转物件仍可操作。
- 收录提示不是第二份游戏状态；存档提交不依赖其计时结束。

## 验证与截图

运行：

```sh
cd src/forum_system
npm run test:all
# 环境没有本地 node_modules 时，可设置 PLAYWRIGHT_PATH 指向已安装的 playwright。
cd ../..
python3 -m unittest discover -s tests -v
node tests/engine.cjs
python3 -m src.folk_parser check
```

`verification.json` 为 V6 专项实际运行记录。`validation-summary.md` 汇总最终回归结果。测试会核对保护文件哈希、稳定 DOM 根、首次/再次现场进入、全文对照、存档先于动画、3D 关闭/快速关闭/上下文丢失/模块失败、阅读位置、减少动态、离线与响应式热点。

截图包含调查材料文字，可能透露局部线索：
- [桌面论坛](01-forum-desktop.png)
- [点验厅](02-hall-desktop.png)
- [3D 物件查看](03-object-3d.png)
- [收录反馈](04-collected.png)
- [双证据对照](05-comparison-desktop.png)
- [手机现场](06-hall-mobile.png)
- [手机手记](07-comparison-mobile.png)
- [墙后走廊（含复勘画面）](08-passage-desktop.png)

## 下一轮建议

按本轮点验厅标准，逐案独立重做镜头与道具，而不是再叠滤镜。优先补足井院的俯视/反射、空戏台的前后台纵深、镜屋的站位关系；再做真机音画性能与读字可用性测试。保持故事节奏优先，不将所有线索强改为 3D 谜题。
