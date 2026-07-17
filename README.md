# AI 网页学习助手

AI 驱动的浏览器扩展插件，支持**页面总结**、**划词总结**、**思维导图生成**与 **MD 文件导出**。

## 功能

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 页面总结 | `Alt + S` | AI 四维度总结网页内容（是什么/为什么/使用场景/原理），生成思维导图 |
| 划词总结 | `Alt + W` | 选中文本弹出 P 社风格提示框，AI 一句话解释 |
| MD 文件下载 | - | 总结完成后一键下载 Markdown 文件 |
| 思维导图 | - | SVG 渲染的分层思维导图，支持 hover 交互 |

## 技术栈

- **框架**: Vue 3 (Composition API + SFC)
- **构建**: Vite 5 + @crxjs/vite-plugin
- **运行环境**: Chrome / Edge 浏览器扩展，Manifest V3
- **AI 接口**: OpenAI Chat Completions 协议兼容

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build
```

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展**，选择 `dist/` 目录
4. 右键扩展图标 → **选项**，配置 API Key / Base URL / 模型名称
5. 打开任意网页，使用 `Alt+S` / `Alt+W` 开始使用

## 项目结构

```
├── src/
│   ├── background.js          # Service Worker
│   ├── lib/                   # 共享工具（AI、Storage、Markdown、SVG 渲染）
│   ├── composables/           # Vue Composables（useConfig、useAI）
│   ├── content/               # Content Script（Vue 3 App）
│   ├── popup/                 # 弹窗界面（Vue 3 App）
│   ├── settings/              # 设置页面（Vue 3 App）
│   └── mindmap/               # 思维导图页面（纯 JS）
├── dist/                      # 构建输出
├── manifest.json              # 扩展清单
└── vite.config.js             # Vite 配置
```

## 支持的 AI 平台

兼容所有 OpenAI 协议的 API，包括：

- [OpenAI](https://platform.openai.com/)
- [DeepSeek](https://platform.deepseek.com/)
- [通义千问](https://dashscope.aliyun.com/)
- [智谱 ChatGLM](https://open.bigmodel.cn/)

## License

MIT
