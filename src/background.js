/**
 * Service Worker - 快捷键监听与消息中转
 */
let wordSummaryEnabled = false

// 监听快捷键
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  switch (command) {
    case 'page-summary':
      chrome.tabs.sendMessage(tab.id, { action: 'pageSummary' }).catch(() => {})
      break
    case 'toggle-word-summary':
      wordSummaryEnabled = !wordSummaryEnabled
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleWordSummary',
        enabled: wordSummaryEnabled
      }).catch(() => {})
      break
  }
})

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    getWordSummaryState: () => sendResponse({ enabled: wordSummaryEnabled }),
    downloadMarkdown: () => {
      downloadMarkdownFile(message.content, message.filename)
      sendResponse({ success: true })
    },
    openMindmap: () => {
      openMindmapPage(message.data)
      sendResponse({ success: true })
    },
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

/** 下载 Markdown 文件 */
function downloadMarkdownFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const reader = new FileReader()
  reader.onloadend = () => {
    chrome.downloads.download({
      url: reader.result,
      filename: filename || 'page-summary.md',
      saveAs: true
    }).catch(() => {})
  }
  reader.readAsDataURL(blob)
}

/** 打开思维导图页面 */
async function openMindmapPage(data) {
  await chrome.storage.local.set({ mindmapData: data })
  const url = chrome.runtime.getURL('src/mindmap/index.html')
  await chrome.tabs.create({ url })
}
