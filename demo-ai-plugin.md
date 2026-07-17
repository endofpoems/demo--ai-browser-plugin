角色

你是一名资深程序员,

背景

ai网页学习插件是一个Edge浏览器AI插件，它包含的主要功能是辅助网页文档学习，包含页面总结、划词总结、MD文件生成三个功能。

技术栈

- 框架：Vue 3（Composition API + SFC）
- 构建：Vite 5 + @crxjs/vite-plugin（Chrome Extension 构建插件）
- 运行环境：Edge/Chrome 浏览器扩展，Manifest V3
- 语言：JavaScript（ES6+），ES Module
- 模块系统：ES Module（import/export），Vue SFC 单文件组件
- 异步：async/await + fetch，不引入第三方 HTTP 库
- 存储：chrome.storage.sync（配置）/ chrome.storage.local（临时数据）
- AI 接口：OpenAI Chat Completions 协议兼容（POST /v1/chat/completions）
- DOM：Vue 模板 + v-if/v-for/v-html 响应式渲染
- CSS：Vue SFC scoped 样式 + 全局 CSS，Flexbox 布局
- 图表：思维导图用纯 SVG 自绘（lib/mindmap-render.js），不引入图表库
- 依赖：vue@3.4.0, @vitejs/plugin-vue@5, @crxjs/vite-plugin@2-beta

工程规范

- 构建流程：`npm run build` → `dist/`，加载 `dist/` 目录到浏览器
- 模块结构：`src/lib/` 共享工具层 → `src/composables/` Vue 逻辑层 → Vue SFC 组件层
- Content Script 隔离：Vue App 挂载到动态容器 div#ai-plugin-root，不修改宿主页面结构
- 组件通信：Popup/Settings/Mindmap 各自为独立 Vue App；Content Script 与 Background 通过 chrome.runtime.sendMessage 通信
- Service Worker：background.js 为独立 JS 文件，状态仅通过 chrome.storage 持久化
- 安全：API Key 存 chrome.storage.sync，fetch 请求中携带，不暴露到 DOM
- 错误处理：所有 AI 请求 try-catch，失败时显示通知（红色渐变条，4 秒自动消失）
- 下载：通过 chrome.downloads API（Background）或 Blob URL（Mindmap 页面）
- 测试配置：tmp.txt 存放测试用 API Key 和 Base URL

代码风格

- 命名：变量/函数 camelCase，组件 PascalCase，文件名 kebab-case
- Vue 组件：Composition API（`<script setup>`），模板 + 逻辑 + 样式同一文件
- 共享模块：纯 JS 函数导出，不依赖 Vue 响应式
- Composables：以 `use` 前缀命名（useConfig、useAI），返回响应式状态和方法
- 注释：中文注释，说明模块和函数用途
- 异步：统一 async/await，try-catch 包裹所有 fetch
- UI 风格：暗色调 + 金色边框（P社风格），卡片式浮层面板
- 格式：2 空格缩进，字符串优先单引号，模板字符串用反引号

模块结构（v2.0 重构版）

src/
├── background.js              # Service Worker：快捷键监听、消息中转
├── lib/
│   ├── ai.js                  # AI 服务：OpenAI 协议封装、聊天请求
│   ├── storage.js             # Chrome Storage 封装：读写 sync/local
│   ├── utils.js               # 工具函数：页面内容提取、MD 生成、导图解析
│   ├── markdown.js            # Markdown → HTML 解析器
│   └── mindmap-render.js      # SVG 思维导图渲染器（BFS 布局 + 贝塞尔曲线）
├── composables/
│   ├── useConfig.js           # 配置管理：加载/保存 API 设置
│   └── useAI.js               # AI 调用封装：页面总结/划词总结/测试连接
├── content/
│   ├── main.js                # Content Script 入口：挂载 Vue App
│   ├── App.vue                # 核心组件：划词 tooltip + 结果面板 + 通知 + 进度遮罩
│   └── content.css            # 备用 CSS（已内联到 App.vue）
├── popup/
│   ├── index.html             # Popup 页面
│   ├── main.js                # Popup 入口
│   └── App.vue                # Popup 组件：状态显示 + 总结/划词按钮
├── settings/
│   ├── index.html             # 设置页面
│   ├── main.js                # 设置入口
│   └── App.vue                # 设置组件：API Key/BaseURL/模型配置 + 测试连接
└── mindmap/
    ├── index.html             # 思维导图页面
    ├── main.js                # 思维导图入口
    └── App.vue                # 思维导图组件：SVG 渲染 + 总结文本 + 下载

业务功能描述

1.页面总结 0.1版：使用快捷键 Alt+S 开启，AI 识别网页知识后系统性总结（是什么/为什么/使用场景/原理），生成思维导图
2.划词总结 0.1版：Alt+W 开启后，选中文本弹出 P社风格 tooltip，AI 一句话解释（<30字）
3.MD文件生成：总结完成后可下载 MD 文件到本地，包含页面标题/URL/日期/总结/思维导图
4.AI 能力兼容 OpenAI 协议，用户在设置页填写 API Key 和 Base URL（如 DeepSeek）

已开发功能

[√] 页面总结 0.1版（Vue 3 重构）
[√] 划词总结 0.1版（Vue 3 重构）
[√] MD文件生成 0.1版（Vue 3 重构）
[√] 设置页面（Vue 3 重构，支持测试连接）
[√] 思维导图页面（Vue 3 重构，SVG 渲染）
[√] 通知系统（Transition 动画）
[√] 错误处理增强（网络/API/解析 全覆盖 try-catch）
[√] 模块复用（AI/Storage/Utils 统一封装）

未开发功能

暂无

测试说明

1. 在 Chrome 中加载 `dist/` 目录为扩展
2. 打开扩展设置页（右键扩展图标 → 选项），填入 tmp.txt 中的 API Key 和 Base URL
3. 点击"测试连接"确认 API 可用
4. 打开任意技术文章页面，按 Alt+S 触发页面总结
5. 按 Alt+W 开启划词总结，选中文字查看解释
6. 在总结面板点击"下载 MD 文件"测试下载
7. 点击"查看思维导图"测试独立页面渲染

Bug 归档

Bug 记录在 bug.md 文件中，分类记录：现象、原因、修复方法
