# Bug 归档

> 项目：AI 网页学习助手（Vue 3 重构版）
> 创建时间：2026-07-17 | 更新：2026-07-18

---

## Bug #001 - CSS 重复加载

**时间**：2026-07-17 | **状态**：已修复

**现象**：manifest.json 中 `content_scripts.css` 与 Vue SFC `@import` 重复引入 CSS。
**原因**：Vite + CRXJS 自动提取 Vue CSS，手动声明导致双重加载。
**修复**：移除 manifest 中的 `css` 字段，CSS 全内联到 `App.vue`。

---

## Bug #002 - lib/markdown.js 写入冲突

**时间**：2026-07-17 | **状态**：已修复

**现象**：两次 Write 写入同一文件，`parseMarkdown` 被覆盖丢失。
**原因**：并行 Write 写同一路径，`parseMindmapMarkdown` 应放 utils.js。
**修复**：`parseMindmapMarkdown` 合并到 `utils.js`，`markdown.js` 仅保留 `parseMarkdown`。

---

## Bug #003 - Mindmap 页面 CRXJS 处理失效

**时间**：2026-07-17 | **状态**：已修复

**现象**：Mindmap 页面 Vue 组件未被编译，浏览器报 `.vue` 导入错误。
**原因**：CRXJS 仅编译 `action`/`options_page` 声明的入口，不处理 `web_accessible_resources`。
**修复**：Mindmap 页改为纯 JS 实现，CSS/JS 内联，移除 Vue 依赖。

---

## Bug #004 - SVG Filter ID 冲突

**时间**：2026-07-18 | **状态**：已修复

**现象**：思维导图侧滑面板多次打开/关闭后，SVG `<filter id="shadow">` 重复定义，滤镜失效。
**原因**：`renderMindmapToSvg` 中 filter ID 硬编码为 `shadow`，多次调用产生重复 ID。
**修复**：引入计数器 `svgFilterCounter`，每次渲染使用唯一 ID `mindmap-shadow-{N}`。

---

## Bug #005 - Resize 时面板高度未同步

**时间**：2026-07-18 | **状态**：已修复

**现象**：拖拽右下角 resize 句柄调整面板大小时，仅宽度变化，高度因 `bottom: auto` 回退到内容高度而非跟随鼠标。
**原因**：`onResizeMove` 中仅更新 `width`，`bottom: auto` 让高度塌陷为内容高度，未显式设置 `height`。
**修复**：`onResizeStart` 存档初始 `rect.height`，`onResizeMove` 中同步更新 `panelStyle.height`。边界限制基于存档的 `panelStartLeft/Top` 避免递归读取 DOM 导致漂移。

---

## Bug #006 - 思维导图面板不跟随总结面板拖动

**时间**：2026-07-18 | **状态**：已修复

**现象**：展开思维导图后拖拽总结面板，导图停留在原位不与面板联动，视觉上脱离。
**原因**：`onPanelDragMove` 仅更新 `panelStyle`，未同步更新 `mindmapSlideStyle`。
**修复**：新增 `syncMindmapPosition()` 函数，拖拽/Resize 结束时调用，根据面板 `getBoundingClientRect()` 重新计算导图面板的 `left/top/height`。

---

## Bug #007 - 点击×关闭链式Tooltip时冒出新弹窗

**时间**：2026-07-18 | **状态**：已修复

**现象**：在第二个链式 Tooltip 上点击 × 关闭按钮后，立即冒出一个新的 Tooltip（内容为页面残留选中文本）。
**原因**：`closeTooltip(idx)` 中 `splice` 移除后，全局 `mouseup` 事件仍然触发 `onMouseUp`，读取 `window.getSelection()` 的残留文本并创建新 Tooltip。`@click.stop` 仅阻止 click 冒泡，无法阻止浏览器级 mouseup。
**修复**：1) 关闭按钮增加 `@mousedown.stop` 阻止 mousedown 冒泡；2) 引入 `preventNextTooltip` 标志位，`closeTooltip` 中设为 `true`，`onMouseUp` 开头检测到则跳过并复位。

---

## Bug #008 - 有序列表未包裹 `<ol>` 导致 DOM 结构错误

**时间**：2026-07-18 | **状态**：已修复

**现象**：Markdown `1. 有序项` 被转换为裸 `<li>有序项</li>`，既没第一阶段包裹 `<ol>`，第二阶段第71行又将其作为块级标签直接输出，导致 `<li>` 不在 `<ol>` 或 `<ul>` 内。
**原因**：第47行 `html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')` 直接用 `<li>` 替换有序列表项，缺少类似无序列表第43行的 `<ol>` 包裹逻辑。第二阶段把裸 `<li>` 当作块级标签跳过。
**修复**：
1. 第一阶段用 `<oli>` 中间标签标记有序项（区分无序 `<li>`）
2. 第二阶段用 `listClose` 变量（`'</ul>'` / `'</ol>'`）区分列表类型
3. `<oli>` 行自动包裹 `<ol>`，`<li>` 行自动包裹 `<ul>`
4. 混合有序/无序列表时自动关闭旧列表开启新列表
5. 从第71行块级标签正则中移除 `li`
