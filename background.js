/**
 * Service Worker - 处理快捷键和消息中转
 */

// 全局状态：划词总结开关
let wordSummaryEnabled = false;

/**
 * 监听快捷键命令
 */
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  switch (command) {
    case 'page-summary':
      chrome.tabs.sendMessage(tab.id, { action: 'pageSummary' });
      break;
    case 'toggle-word-summary':
      wordSummaryEnabled = !wordSummaryEnabled;
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleWordSummary',
        enabled: wordSummaryEnabled
      });
      break;
  }
});

/**
 * 监听来自 content script 和 popup 的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getWordSummaryState':
      sendResponse({ enabled: wordSummaryEnabled });
      break;
    case 'downloadMarkdown':
      downloadMarkdownFile(message.content, message.filename);
      sendResponse({ success: true });
      break;
    case 'openMindmap':
      openMindmapPage(message.data);
      sendResponse({ success: true });
      break;
    case 'toggleWordSummaryFromPopup':
      wordSummaryEnabled = !wordSummaryEnabled;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleWordSummary',
            enabled: wordSummaryEnabled
          });
        }
      });
      sendResponse({ enabled: wordSummaryEnabled });
      break;
    default:
      break;
  }
  return true;
});

/**
 * 下载 Markdown 文件
 */
function downloadMarkdownFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename || 'page-summary.md',
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}

/**
 * 打开思维导图页面
 */
async function openMindmapPage(data) {
  // 存储数据以便 mindmap 页面读取
  await chrome.storage.local.set({ mindmapData: data });

  const url = chrome.runtime.getURL('mindmap/mindmap.html');
  await chrome.tabs.create({ url });
}
