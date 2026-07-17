/**
 * Popup 交互逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
  const btnSummary = document.getElementById('btn-summary');
  const btnWordSummary = document.getElementById('btn-word-summary');
  const btnSettings = document.getElementById('btn-settings');
  const statusBar = document.getElementById('status-bar');
  const wordStatus = document.getElementById('word-status');

  // 检查配置状态
  const config = await getConfig();
  const statusText = statusBar.querySelector('.status-text');
  const statusDot = statusBar.querySelector('.status-dot');

  if (config.apiKey) {
    statusText.textContent = '已配置 API';
    statusDot.style.background = '#22c55e';
  } else {
    statusText.textContent = '请先配置 API Key';
    statusDot.style.background = '#f59e0b';
  }

  // 获取划词总结状态
  chrome.runtime.sendMessage({ action: 'getWordSummaryState' }, (response) => {
    updateWordSummaryUI(response?.enabled || false);
  });

  // 页面总结按钮
  btnSummary.addEventListener('click', async () => {
    if (!config.apiKey) {
      chrome.runtime.openOptionsPage();
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'pageSummary' });
    window.close();
  });

  // 划词总结按钮
  btnWordSummary.addEventListener('click', async () => {
    if (!config.apiKey) {
      chrome.runtime.openOptionsPage();
      return;
    }

    chrome.runtime.sendMessage({ action: 'toggleWordSummaryFromPopup' }, (response) => {
      updateWordSummaryUI(response?.enabled || false);
      window.close();
    });
  });

  // 设置按钮
  btnSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function updateWordSummaryUI(enabled) {
    if (enabled) {
      wordStatus.textContent = '已开启 · 点击关闭';
      wordStatus.style.color = '#22c55e';
    } else {
      wordStatus.textContent = '点击开启';
      wordStatus.style.color = '#6366f1';
    }
  }
});

function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'baseUrl', 'modelName'], (items) => {
      resolve({
        apiKey: items.apiKey || '',
        baseUrl: items.baseUrl || 'https://api.openai.com',
        modelName: items.modelName || 'gpt-3.5-turbo'
      });
    });
  });
}
