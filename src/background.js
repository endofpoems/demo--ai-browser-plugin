/**
 * Service Worker - 快捷键监听与消息中转
 * 职责：
 * 1. 监听全局快捷键 Alt+S（页面总结）/ Alt+W（切换划词总结）
 * 2. 中转 Content Script 与 Popup/Settings 之间的消息
 * 3. 管理划词开关状态
 * 4. 触发 MD 文件下载和思维导图页面打开
 */
let wordSummaryEnabled = false

// 监听快捷键命令（在 manifest.json 中声明）
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  switch (command) {
    case 'page-summary':
      // 通知 Content Script 执行页面总结
      chrome.tabs.sendMessage(tab.id, { action: 'pageSummary' }).catch(() => {})
      break
    case 'toggle-word-summary':
      // 切换划词总结开关状态
      wordSummaryEnabled = !wordSummaryEnabled
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleWordSummary',
        enabled: wordSummaryEnabled
      }).catch(() => {})
      break
  }
})

// 监听来自 Popup / Content Script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    // Popup 获取当前划词开关状态
    getWordSummaryState: () => sendResponse({ enabled: wordSummaryEnabled }),

    // Content Script 请求下载 Markdown 文件
    downloadMarkdown: () => {
      downloadMarkdownFile(message.content, message.filename)
      sendResponse({ success: true })
    },

    // Content Script 请求打开思维导图页面（独立 Tab）
    openMindmap: () => {
      openMindmapPage(message.data)
      sendResponse({ success: true })
    },

    // Popup 切换划词开关并通知当前活跃标签页
    toggleWordSummaryFromPopup: () => {
      wordSummaryEnabled = !wordSummaryEnabled
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleWordSummary',
            enabled: wordSummaryEnabled
          }).catch(() => {})
        }
      })
      sendResponse({ enabled: wordSummaryEnabled })
    }
  }

  const handler = handlers[message.action]
  if (handler) {
    handler()
    return true // 保持消息通道开启以支持异步 sendResponse
  }
  return false
})

/** 
 * 下载 Markdown 文件
 * 原理：将文本内容转为 Blob → FileReader → DataURL → chrome.downloads API 触发下载
 */
function downloadMarkdownFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const reader = new FileReader()
  reader.onloadend = () => {
    chrome.downloads.download({
      url: reader.result,
      filename: filename || 'page-summary.md',
      saveAs: true // 弹出另存为对话框
    }).catch(() => {})
  }
  reader.readAsDataURL(blob)
}

/** 
 * 打开思维导图独立页面
 * 原理：将数据存入 storage.local → 打开 web_accessible_resources 中的 HTML 页面 → 页面从 storage 读取数据渲染
 * 注意：思维导图页面为纯 JS 实现（不依赖 Vue），因为 CRXJS 不编译 web_accessible_resources 中的 HTML
 */
async function openMindmapPage(data) {
  await chrome.storage.local.set({ mindmapData: data })
  const url = chrome.runtime.getURL('src/mindmap/index.html')
  await chrome.tabs.create({ url })
}
