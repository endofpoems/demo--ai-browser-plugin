角色

你是一名资深程序员。

背景

AI网页学习插件是一个Edge浏览器插件，功能：页面总结、划词总结、MD文件生成。

技术栈

- Vue 3 (Composition API + SFC) + Vite 5 + @crxjs/vite-plugin
- Chrome Extension Manifest V3，ES Module
- chrome.storage（sync 存配置 / local 存临时数据）
- OpenAI Chat Completions 协议兼容 API
- 思维导图纯 SVG 自绘，无图表库依赖

工程规范

- `npm run build` → 加载 `dist/` 到浏览器
- Content Script 挂载到 div#ai-plugin-root，不污染宿主页面
- 组件通信仅通过 chrome.runtime.sendMessage
- API Key 存 storage.sync，不暴露到 DOM
- 所有 fetch 必须 try-catch，失败通知 4 秒消失

代码风格

- camelCase / PascalCase / kebab-case；`<script setup>`；中文注释
- 共享模块纯函数导出，Composables 用 `use` 前缀
- 2 空格缩进，async/await 统一异步处理

业务功能

1. 页面总结：Alt+S，AI 四维度总结（是什么/为什么/使用场景/原理）+ 思维导图
2. 划词总结：Alt+W，选中文本弹出提示框，AI 一句话解释（≤30字）
3. MD下载：总结完成后下载 Markdown 文件

已开发

[√] 页面总结 [√] 划词总结 [√] MD下载
[√] 设置页（测试连接） [√] 思维导图页 [√] 全链路错误处理

未开发

暂无

测试

加载 dist/ → 设置页填 tmp.txt 的 API Key/BaseURL → 测试连接 → Alt+S / Alt+W 测试

Bug 归档见 bug.md
