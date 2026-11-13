# Draw.io for Orca

在 Orca 桌面版编辑器内离线编辑 `.drawio`、`.drawio.xml` 文件。采用 draw.io 的真实编辑器，不需要打开在线 diagrams.net，也不会把图表发送到远程服务。集成方式使用官方 `sandboxed-ui` / `customEditors` 隔离帧接口，未复制官方插件源码。

![Draw.io 插件封面插画](images/cover.webp)

![离线 draw.io 编辑器浅色预览](images/editing-light.png)

![离线 draw.io 编辑器深色预览](images/editing-dark.png)

## 使用

在 Orca 的插件管理中添加本目录作为本地开发插件（需要通过 manifest 校验）。通过新建文件菜单选择「新建 Draw.io 图表」，或打开已有 `.drawio` 文件。编辑器页用于绘图，Source 页可以检查和修改 XML。

- 多语言界面（英语、简体/繁体中文、德语、法语、西班牙语、意大利语、日语、韩语、荷兰语、波兰语、葡萄牙语（含巴西）、俄语、土耳其语），按 Orca 的系统语言自动选择，没有对应语言时使用英语；形状拖放、连线、文本、样式和图层。
- 常用矢量图形库：通用、UML、ER、BPMN、流程图、基础形状和箭头。
- 多页图表，支持压缩和未压缩的 draw.io XML，保留自定义 mxfile 属性。
- 撤销与重做、缩放、网格、背景颜色和页面设置。
- 跟随 Orca 深浅主题；只读文档禁止写回。
- 约 200 ms 后将变化同步到 Orca 文本缓冲区；文件的脏状态、磁盘保存以及 Ctrl/Cmd+S 由 Orca 管理。保存前等待 `editor.flush`，版本冲突由 Orca 拒绝；失败会显示状态提示，不冒充保存成功。
- 无效文件显示错误并保留源文，不会用空图覆盖。

## 当前范围

这是 Orca 桌面版的离线 XML 编辑器。由于大型 draw.io 库使用 `frame: isolated`，浏览器客户端会回退到 Source。云端存储、在线搜索、AI、远程图片/字体、第三方插件、MathJax、Mermaid/Visio 导入以及依赖额外脚本的布局不在本版本范围内。初始界面提供上述矢量库；上游「更多图形」中的远程图片库不保证可用。需要图片时请使用包含 data URI 的图表。PNG/SVG 中嵌入图表的二进制文件不注册为编辑器类型，普通 `.xml` 文件也不会被接管。

为避免恶意或异常文件冻结编辑器，单个文件或解压后的页面上限为 16 MB，压缩数据上限为 8 MB；同时最多加载 100 页及 100,000 个 XML 元素。

导出与浏览器文件菜单未接入；使用 Orca 保存 `.drawio`，需要其他导出格式时可用 draw.io 桌面版打开。编辑器菜单中保留的上游功能可能受 Orca 沙箱限制。

## 构建与验证

构建需要 Node.js 22+。编辑器运行在 Orca 桌面版的隔离 Chromium frame 中；构建完全使用 Node 内置模块，产物位于 `editor/`，安装后无需 npm 或联网。

```sh
git clone --filter=blob:none --no-checkout https://github.com/jgraph/drawio.git /tmp/orca-drawio-upstream
git -C /tmp/orca-drawio-upstream checkout 84487b4891cbc0f32d7e30f34cf878c87cb1f414
DRAWIO_DIR=/tmp/orca-drawio-upstream node plugins/drawio/build/build.mjs
ORCA_DIR=/data/LinDoo/orca node plugins/drawio/build/tests/editor.test.mjs
ORCA_DIR=/data/LinDoo/orca node plugins/drawio/build/tests/language.test.mjs
node /data/LinDoo/orca/config/scripts/validate-plugin-files.mjs plugins/drawio
```

构建脚本核对上游固定提交；将编辑器核心、形状、精简 stencil、多语言资源、样式、启动代码和文档桥接代码输出为独立文件。隔离帧只通过插件目录内的相对 URL 加载脚本与资源，不使用 Blob 脚本或外部网络。入口 HTML 保持很小；源码在 `build/src/`，请修改源码后重新构建，勿直接修改 `editor/` 产物。

浏览器测试使用 `ORCA_DIR` 中已安装的 Playwright，需要已安装 Chromium（`playwright install chromium`）。测试运行在与 Orca 隔离帧相同的独立 origin 和 CSP 下，覆盖本地多文件加载、干净打开、形状编辑、保存刷新、撤销重做、背景配置、压缩多页、自定义属性、冲突重试、只读、无效 XML 和主题，并断言没有外部网络请求。测试用文档宿主替身模拟 Orca 接口；真实 Orca 中的安装与快捷键还需手动验收。

## 发布状态

本插件以 `lindoo.drawio` 提交至上游仓库审核，展示作者为 LinDoo。目录条目位于仓库根目录的 `orca-catalog.json`，发布记录通过 `scripts/release-entry.mjs` 从已提交的插件内容生成。

## 许可证与来源

本插件使用 Apache-2.0。内嵌 draw.io 32.6.1，固定提交 `84487b4891cbc0f32d7e30f34cf878c87cb1f414`，来自 <https://github.com/jgraph/drawio>，其版权和许可证见 `THIRD_PARTY_NOTICES.txt` 和 `LICENSE`。编译脚本保留上游 JavaScript 内的许可证注释。未将 draw.io 商标或图标作为本插件的自有标识。

## 图片资源

`images/icon.png` 为市场图标（256×256），`images/tab-icon.png` 用于编辑器标签和新建菜单（128×128），`images/cover.webp` 为市场封面（1600×1000）。三张 `editing-*.png` 是实际离线编辑器截图（1600×1000），已在 manifest 中注册。旧预览 `editor-dark.png` 保留。

图标和封面使用内置 imagegen 生成，提示词与来源见 [图片资源说明](images/README.md)。封面为宣传插画；界面截图由 Playwright 实际运行编辑器生成。可用 `ORCA_DIR=/data/LinDoo/orca node plugins/drawio/build/preview.mjs` 重新生成截图，设置 `DRAWIO_ICON_SOURCE`、`DRAWIO_COVER_SOURCE` 为原始 PNG 文件路径可重新导出图标与封面。
