# V4.1 仓库整理记录

本次为目录、资料库和开发入口升级，不宣称新增 58 个可玩本，也不重置 V3/V4 剧情进度。

| 旧位置（wanxiang-forum 下） | 新位置（awesome-chinese-folk-game 下） |
|---|---|
| 页面、UI、音效、美术、测试 | `src/forum_system/` |
| `data.js` 与 `chapters/*.js` 中的九案数据 | `cases/playable/*/case.json` |
| `chapters/source/` | `cases/authoring/serial/` |
| `tools/package_release.py` | `tools/package_release.py`（按新根目录重写） |
| `releases/` | `releases/` |
| 原版说明 | `docs/history/README-v4.md`（历史快照，不作为新启动指南） |

`src/forum_system/data.js` 是可重建的运行快照，不是新的编辑源。旧 `chapters/` 只保留迁移说明。首案旧版交互适配与部分界面提示仍在 `app.js`；本轮没有冒险重写其整个渲染器。

## 资源边界

- **运行素材**：`src/forum_system/assets/`。页面直接加载；不引用根目录展示图。
- **展示素材**：根 `assets/`。README 封面、真实截图与 GIF；游戏不依赖这些文件。
- **美术源稿**：`src/forum_system/art/source/`，包括 Blender 场景源代码与最后场景工程。
- **研究与历史**：`src/forum_system/research/`、`backups/` 和 `releases/legacy/`，留在本地统一根目录内，忽略版本跟踪/排除发布包。

## 数据与存档安全

迁移前已保存 `src/forum_system/backups/v4-before-repository-migration.zip`，以及运行数据快照与文件哈希。九案迁移后的运行数据与快照逐项相同；寄名簿创作源重建后也一致。

旧存档键不变。相同 HTTP 来源通常可直接继续；文件路径、主机名或端口改变不能保证浏览器共享存储。必要时从 `releases/legacy/` 旧版打开并导出，再由新版导入。不要为了让新界面显示进度而清空浏览器数据。

## 单一编辑源

主题 Markdown → 库索引；可玩 JSON → 游戏快照；连续案创作源 → 对应 JSON。主题文件不采用数字编号，后续直接新增稳定名字即可。保留 58 个参考方向的结构化梗概，不把重复的第一批再存一遍。

## 不在本次范围

未上传远程仓库，未选择覆盖全部代码/参考材料的开源许可证，未把参考目录命名当作独家权利证明。新主题的正式剧情开发需要另行完成伏笔、条件图和完整通关验收。
