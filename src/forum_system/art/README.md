# 原创现场与声音资产 / V5 · 灯下旧档

全部运行资源位于 `../assets/`，全部新增源代码也留在本项目。未使用外部模型、贴图库、参考游戏画面或 AI 生图 API。根目录 `assets/` 的封面、截图和 GIF 只供仓库展示，不参与运行。

## 十二幅现场

`source/build_scenes.py` 使用 Blender / Cycles 建模与预渲染，输出 **1920×1200 JPEG**、48 采样并降噪。V5 增加旧木纹、布面、纸张、墙体风化、微裂缝、潮湿石面与冷暖光。雪夜有结霜窗格与冷蓝反光；戏台和花轿改为起褶布帘；镜室、井院和礼堂区分墙面色调，干燥库房不铺室内水洼。所有主物件位置、摄影机位置、8:5 构图和证据热点保持不变；细部装饰不承载谜底，不是新线索。

从项目根目录运行：

```sh
blender -b --python src/forum_system/art/source/build_scenes.py
# 单独重建某一幅（每幅独立随机种子，不依赖渲染顺序）
blender -b --python src/forum_system/art/source/build_scenes.py -- mirror
# Apple Silicon 可选加速，无需改变 Blender 全局配置
WEIMING_RENDER_DEVICE=METAL blender -b --python src/forum_system/art/source/build_scenes.py
```

默认 CPU，可选 Metal 不可用时回退 CPU。几何直接创建，避免逐物件操作器产生的额外开销。输出为 `src/forum_system/assets/scenes/*.jpg`；`source/latest-set.blend` 保存最近生成的场景，其余现场由脚本重建。不同 Blender 版本或 CPU/GPU 的降噪可能产生少量像素差异。

首案夜景与旧版 SVG 保留；没有冒险替换已经对应剧情的构图。图中没有必须识别的小字；关键信息由可访问的文字和热点按钮提供。

## 纸张 / 布面纹理

```sh
# 可选美术开发依赖：Pillow、numpy；运行游戏不需要安装
python3 src/forum_system/art/source/build_textures.py
```

输出 `assets/textures/paper-fibers.webp` 与 `archive-cloth.webp`，均为 512×512。固定种子生成纸纤维、色差与布纹，没有下载第三方纹理。纹理叠加不改变证据文本或判定。

## 分场景声音

`../soundscape.js` 是新增环境声和操作音的完整源代码。Web Audio 在浏览器中实时合成，无外部音源、语音接口、网络请求或背景音乐订阅。

- 四个固定环境声源：细雨噪声、缓慢起伏的有色风声、疏密错落的水滴、轻微夜班电流。
- 九组混音状态：论坛、档案、私信、水岸、井院、旧屋、雪夜、空戏台、归档之后。
- 翻页、选择、查看、收录、私信和推理确认使用短音包络；同屏短音最多六个，播放后自动断开。
- 单个 AudioContext，环境与操作分轨，总线动态压缩；音量归零在短淡出后到达数字静音。没有随机叫声、突发重击或超低频惊吓。
- 磁带仍是原有 `last-recording.mp3`：原创对白经系统中文语音生成与磁带处理。这轮未重写对白。点击才播放，配有完整转写；公开发布前仍需确认系统语音输出的适用权利。

声音默认关闭，三路音量可调；后台暂停声音和装饰动画。音效绝不作为推进条件。源与测试细节见 [V5 说明](../../../docs/immersion-v5.md)。

## 冻结前的工程可迁移性检查

V5 冻结时只清理 `latest-set.blend` 的绝对渲染输出路径与文件浏览器目录，改为工程相对路径；无外链图像依赖，没有重新渲染现场。清理前工程保留于本地 `backups/v5-before-freeze-metadata.blend`。`tools/sanitize_blend.py` 可在 Blender 工厂启动、禁用自动脚本的背景模式下重做这项元数据清理；使用前请另存备份。
