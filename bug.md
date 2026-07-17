# Bug 归档

> 项目：AI 网页学习助手（Vue 3 重构版）
> 创建时间：2026-07-17

---

## Bug #001 - CSS 重复加载

**时间**：2026-07-17
**状态**：已修复

**现象**：
- manifest.json 中 `content_scripts.css` 引入了 `src/content/content.css`
- Vue SFC 中 `@import './content.css'` 又引入了一次
- 导致 CSS 被加载两次，体积翻倍

**原因**：
- Vite + CRXJS 插件会自动提取 Vue SFC 中的 CSS 到 manifest 的 content_scripts.css 中
- 手动添加的 CSS 和自动提取的 CSS 重复了

**修复方法**：
- 从 `manifest.json` 的 `content_scripts` 中移除 `css` 字段
- 将 CSS 完整内联到 `App.vue` 的 `<style>` 中，由 Vite 统一处理

---

## Bug #002 - lib/markdown.js 写入冲突

**时间**：2026-07-17
**状态**：已修复

**现象**：
- 先后两次 Write 操作写入了同一个文件 `src/lib/markdown.js`
- 第一次写入 `parseMarkdown` 函数，第二次写入 `parseMindmapMarkdown` 函数
- 第二次覆盖了第一次，导致 `parseMarkdown` 丢失

**原因**：
- 并行 Write 操作写入了同一路径
- parseMindmapMarkdown 应该放在 utils.js 而非单独的 markdown.js

**修复方法**：
- 将 `parseMindmapMarkdown` 合并到 `src/lib/utils.js` 中
- `src/lib/markdown.js` 仅保留 `parseMarkdown`

---

## Bug #003 - Mindmap 页面 CRXJS 处理失效

**时间**：2026-07-17
**状态**：已修复

**现象**：
- `mindmap/index.html` 中的 Vue app 未被 CRXJS 编译处理
- `dist/src/mindmap/main.js` 仍保留原始 `import` 语句
- `dist/src/mindmap/App.vue` 是未编译的 SFC 源文件
- 在浏览器中加载会报错：无法解析 `.vue` 文件和裸 `vue` 导入

**原因**：
- CRXJS 插件仅处理 manifest 中 `action.default_popup`、`options_page` 等显式声明的 HTML 入口
- `web_accessible_resources` 中的 HTML 被视为静态资源，不做编译处理
- Mindmap 页面仅列在 `web_accessible_resources` 中，因此未被编译

**修复方法**：
- 将 Mindmap 页面改为纯 JS 实现（不依赖 Vue）
- MindMapRenderer 类内联到 `mindmap.js` 中
- CSS 内联到 `mindmap/index.html` 的 `<style>` 中
- 删除 `src/mindmap/main.js` 和 `src/mindmap/App.vue`
- 工具函数（parseMindmapMarkdown、generateMarkdown 等）也在 mindmap.js 中自包含

---
