# 仓库展示素材（不是游戏运行资源）

- `cover_banner.png`：用本项目灯厅场景合成的仓库封面。
- `screenshots/`：V5 真实游戏截图，含论坛、场景、手记、声音设置与手机论坛；`ending-spoiler.png` 含结局剧透。该结局图由连续案真实通关回归生成，其余由 `capture_showcase.cjs` 生成。
- `preview_gif.gif`：论坛 → 读帖 → 私信 → 场景 → 手记的真实操作截图节选，省略阅读等待，非连续实时录像。

重建：先启动根 `main.py`，安装可选 Playwright / Pillow 后执行：

```sh
node tools/capture_showcase.cjs
python3 tools/build_showcase.py
```

可用 `PLAYWRIGHT_PATH`、`CHROME_PATH`、`GAME_URL` 指定环境。封面脚本默认使用 macOS 本地宋体与 Arial；其他系统通过 `--font`、`--latin-font` 指定可用字体，字体文件不随仓库分发。展示图不影响启动器运行。

游戏内资源在 [`../src/forum_system/assets/`](../src/forum_system/assets/)，原创美术源见 [`../src/forum_system/art/`](../src/forum_system/art/)。不要把研究参考图放入展示或运行路径。
