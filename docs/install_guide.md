# 安装与启动 / Installation

## 推荐：一条命令

Python **3.9 或更高版本**，无需 pip 包、数据库、账号或 API Key。在项目根目录执行：

```sh
python3 demo/run_demo.py
```

正式入口等价：`python3 main.py`。启动器会先校验/生成剧本快照，再打开 `http://127.0.0.1:4173/`。终端保持开启；Ctrl+C 停止。

Windows 可用 `py -3 demo/run_demo.py`；若 `python3` 不存在，用本机 Python 3 对应命令。

脚本按自身位置定位项目，从任意工作目录启动也能找到内容：

```sh
python3 /你的路径/awesome-chinese-folk-game/demo/run_demo.py --no-browser
```

### 常用参数

```sh
python3 main.py --check              # 只校验内容，不启动服务
python3 main.py --no-browser         # 不自动打开浏览器
python3 main.py --port 4174          # 端口占用时更换
python3 main.py --host localhost     # 延用之前的 localhost 存档来源
```

默认只监听本机。确需同一局域网手机体验时可指定 `--host 0.0.0.0`，再用电脑局域网 IP 访问；启动器不是经过加固的公网服务，不要直接暴露到互联网。手机与电脑的浏览器存档相互独立。

## 无 Python：双击离线页面

直接打开 `src/forum_system/index.html`；macOS 也可双击同目录的 `启动游戏.command`。此方式使用已提交的 `data.js` 快照，**不自动编译新改的剧本**。全部运行素材本地加载，网络断开仍能玩。

若 `.command` 无执行权限：`chmod +x src/forum_system/启动游戏.command`，或直接打开 HTML。

保留完整 `src/` 目录：页面还引用相邻的 `case_engine/engine.js` 和 `utils/config.js`。不能只拷贝 `forum_system` 子目录作为独立发布包。根启动器会为共享模块提供正确路由；旧命令 `cd src/forum_system && python3 -m http.server` 不再推荐。

## 内容修改与校验

```sh
python3 -m src.folk_parser check
python3 -m src.folk_parser build
# 改过寄名簿创作源时，先执行：
python3 cases/authoring/serial/build_serial.py
```

`build` 更新运行数据、全库 JSON 索引与 Markdown 目录。不要手改生成的 `data.js`。

## 开发测试（可选）

Python 检查不需要额外安装：

```sh
python3 -m unittest discover -s tests -v
node tests/engine.cjs
```

浏览器回归需要 Node.js 18+、npm 和 Chrome/Chromium：

```sh
cd src/forum_system
npm install
npx playwright install chromium  # 没有可用 Chrome 时安装
npm start                       # 第一个终端
npm run test:all                 # 第二个终端，同目录
```

`CHROME_PATH` 可指定 Chrome 路径；`GAME_URL` 可指定服务 URL；已有 Playwright 可通过 `PLAYWRIGHT_PATH` 指向其模块目录。测试使用独立浏览器上下文，会在测试上下文清空测试存档，不接触日常浏览器档案。

## 发布与搬家

```sh
python3 tools/package_release.py --output releases/my-build.zip
```

输出指定的 `releases/my-build.zip` 和 SHA256，压缩包根目录为 `awesome-chinese-folk-game/`。包括主题库、案卷、页面、运行美术和源码；不带研究抓取、历史备份、用户存档或 node_modules。包内 `FREEZE-MANIFEST.json` 记录每个载荷文件的校验值（不包含清单自身）。已有同名包若内容不同，打包器会拒绝覆盖；继续开发请换文件名。当前冻结包与校验方法见 [冻结报告](freeze-v5.0.md)。

**迁移存档先导出整柜。** `localhost` 和 `127.0.0.1`、不同端口、不同浏览器及 `file://` 之间不共享 localStorage。项目改名不会改变键名，但文件路径变化可能让离线浏览器使用新的存储空间；此时从旧版导出再导入，而不是清除存储。

## English quick start

Use Python 3.9+: `python3 demo/run_demo.py`. No pip dependencies or online services are needed. The launcher validates and builds the local library before serving on loopback port 4173. Alternatively, open `src/forum_system/index.html` with the complete `src/` directory intact. Export your save before changing host, port, browser or file path. The lightweight Python server is for local development, not public production hosting.
