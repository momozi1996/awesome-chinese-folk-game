# Case engine / 推理规则

`engine.js` 为浏览器与 Node 共用的无 DOM 模块，实际由论坛调用：
- `requirementsMet`：证据与解释的双门槛，续帖和复勘不会过早开放。
- `inferenceCorrect`：先持有两份证据，再核对解释。
- `blankCaseState` / `normalizeCase`：按案隔离状态、过滤损坏存档、不允许缺线索却直接归档。

内容依赖图与串联环路的构建期检查在 `../folk_parser/library.py`。
首案的旧版交互适配仍在 `forum_system/app.js`；本模块不是网络服务，也不声称已经拆出所有 UI。

测试：仓库根目录运行 `node tests/engine.cjs`。
