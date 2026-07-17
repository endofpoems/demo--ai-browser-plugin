/**
 * Content Script - 页面交互、划词总结、页面总结
 */

(function () {
  'use strict';

  // ==================== 划词总结功能 ====================
  let wordSummaryEnabled = false;
  let tooltipEl = null;
  let tooltipTimer = null;
  let isTooltipVisible = false;

  // 创建 P社风格 tooltip 元素
  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'ai-tooltip-container';
    tooltipEl.innerHTML = `
      <div class="ai-tooltip-frame">
        <div class="ai-tooltip-corner ai-tooltip-corner-tl"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-tr"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-bl"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-br"></div>
        <div class="ai-tooltip-header">
          <span class="ai-tooltip-icon">&#9670;</span>
          <span class="ai-tooltip-title">AI 划词总结</span>
        </div>
        <div class="ai-tooltip-divider"></div>
        <div class="ai-tooltip-body">
          <div class="ai-tooltip-loading">
            <span class="ai-tooltip-spinner"></span>
            正在分析...
          </div>
          <div class="ai-tooltip-content" style="display:none;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(x, y) {
    if (!tooltipEl) createTooltip();

    const body = tooltipEl.querySelector('.ai-tooltip-body');
    const loading = tooltipEl.querySelector('.ai-tooltip-loading');
    const content = tooltipEl.querySelector('.ai-tooltip-content');
    loading.style.display = 'flex';
    content.style.display = 'none';
    content.textContent = '';

    // 计算位置，确保不超出屏幕
    const tooltipWidth = 340;
    const tooltipHeight = 180;
    let posX = x + 15;
    let posY = y - 10;

    if (posX + tooltipWidth > window.innerWidth - 10) {
      posX = x - tooltipWidth - 15;
    }
    if (posY + tooltipHeight > window.innerHeight - 10) {
      posY = y - tooltipHeight - 10;
    }
    if (posX < 5) posX = 5;
    if (posY < 5) posY = 5;

    tooltipEl.style.left = posX + 'px';
    tooltipEl.style.top = posY + 'px';
    tooltipEl.classList.add('visible');
    isTooltipVisible = true;
  }

  function updateTooltipContent(summary) {
    if (!tooltipEl) return;
    const loading = tooltipEl.querySelector('.ai-tooltip-loading');
    const content = tooltipEl.querySelector('.ai-tooltip-content');
    loading.style.display = 'none';
    content.style.display = 'block';
    content.textContent = summary;
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.classList.remove('visible');
      isTooltipVisible = false;
    }
  }

  // 监听文本选择
  document.addEventListener('mouseup', async (e) => {
    if (!wordSummaryEnabled) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0 && selectedText.length < 300) {
      createTooltip();
      showTooltip(e.clientX, e.clientY);

      // 调用 AI 进行总结
      try {
        const summary = await summarizeWord(selectedText);
        updateTooltipContent(summary);
      } catch (err) {
        updateTooltipContent('总结失败: ' + err.message);
      }
    } else if (!selectedText && isTooltipVisible) {
      // 延迟隐藏，让用户有时间点击
      tooltipTimer = setTimeout(() => {
        hideTooltip();
      }, 200);
    }
  });

  // 点击 tooltip 外部时隐藏
  document.addEventListener('mousedown', (e) => {
    if (tooltipEl && !tooltipEl.contains(e.target) && isTooltipVisible) {
      hideTooltip();
    }
  });

  async function summarizeWord(text) {
    const config = await getConfig();
    if (!config.apiKey) throw new Error('请先在插件设置中配置 API Key');

    const messages = [
      {
        role: 'system',
        content: '你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。'
      },
      { role: 'user', content: `请解释："${text}"` }
    ];

    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        temperature: 0.5,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.replace(/["""]/g, '').trim();
  }

  // ==================== 页面总结功能 ====================
  async function doPageSummary() {
    // 显示进度提示
    const overlay = createProgressOverlay();
    document.body.appendChild(overlay);

    try {
      const pageMeta = getPageMeta();
      const pageContent = extractPageContent();
      const truncatedContent = truncateText(pageContent, 15000);

      const config = await getConfig();
      if (!config.apiKey) throw new Error('请先在插件设置中配置 API Key');

      const messages = [
        {
          role: 'system',
          content: `你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`
        },
        {
          role: 'user',
          content: `网页标题：${pageMeta.title}\n网页URL：${pageMeta.url}\n网页描述：${pageMeta.description}\n\n网页主要内容：\n${truncatedContent}`
        }
      ];

      const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName,
          messages,
          temperature: 0.7,
          max_tokens: 8192,
          stream: false
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API 错误: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content;

      // 分离总结内容和思维导图
      const mindmapIndex = result.indexOf('## 思维导图');
      let summaryText = result;
      let mindmapText = '';

      if (mindmapIndex !== -1) {
        summaryText = result.substring(0, mindmapIndex).trim();
        mindmapText = result.substring(mindmapIndex).trim();
      }

      // 生成 Markdown 文件内容
      const mdContent = generateMarkdown(pageMeta, summaryText, mindmapText);

      // 移除进度遮罩
      overlay.remove();

      // 显示结果面板
      showResultPanel(summaryText, mindmapText, mdContent, pageMeta);

    } catch (err) {
      overlay.remove();
      showErrorNotification('页面总结失败: ' + err.message);
    }
  }

  function createProgressOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'ai-overlay';
    overlay.innerHTML = `
      <div class="ai-overlay-card">
        <div class="ai-overlay-spinner"></div>
        <div class="ai-overlay-text">AI 正在分析页面内容...</div>
        <div class="ai-overlay-sub">这可能需要几秒钟</div>
      </div>
    `;
    return overlay;
  }

  function showResultPanel(summaryText, mindmapText, mdContent, pageMeta) {
    // 移除旧面板
    const oldPanel = document.querySelector('.ai-result-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.className = 'ai-result-panel';

    const htmlSummary = marked.parse ? marked.parse(summaryText) : summaryText.replace(/\n/g, '<br>');

    panel.innerHTML = `
      <div class="ai-result-header">
        <h2>📋 页面总结</h2>
        <button class="ai-result-close" title="关闭">&times;</button>
      </div>
      <div class="ai-result-body">
        <div class="ai-result-summary">${htmlSummary}</div>
        <div class="ai-result-actions">
          <button class="ai-btn ai-btn-mindmap" id="ai-btn-mindmap">
            <span class="ai-btn-icon">🧠</span> 查看思维导图
          </button>
          <button class="ai-btn ai-btn-download" id="ai-btn-download">
            <span class="ai-btn-icon">📥</span> 下载 MD 文件
          </button>
          <button class="ai-btn ai-btn-cancel" id="ai-btn-cancel">
            <span class="ai-btn-icon">✕</span> 关闭
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 事件绑定
    panel.querySelector('.ai-result-close').addEventListener('click', () => panel.remove());
    panel.querySelector('#ai-btn-cancel').addEventListener('click', () => panel.remove());

    // 思维导图按钮
    panel.querySelector('#ai-btn-mindmap').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'openMindmap',
        data: { mindmapText, pageMeta, summaryText }
      });
    });

    // 下载按钮
    panel.querySelector('#ai-btn-download').addEventListener('click', () => {
      const filename = `${pageMeta.title.replace(/[\\/:*?"<>|]/g, '_')}_总结.md`;
      chrome.runtime.sendMessage({
        action: 'downloadMarkdown',
        content: mdContent,
        filename
      }, () => {
        // 下载反馈
        const btn = panel.querySelector('#ai-btn-download');
        btn.innerHTML = '<span class="ai-btn-icon">✓</span> 已触发下载';
        btn.disabled = true;
        setTimeout(() => {
          btn.innerHTML = '<span class="ai-btn-icon">📥</span> 下载 MD 文件';
          btn.disabled = false;
        }, 2000);
      });
    });

    // 动画进入
    requestAnimationFrame(() => {
      panel.classList.add('visible');
    });
  }

  function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'ai-notification ai-notification-error';
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('visible'));
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  function generateMarkdown(pageMeta, summaryText, mindmapText) {
    const date = new Date().toISOString().split('T')[0];
    return `# ${pageMeta.title}

> **来源**: ${pageMeta.url}
> **生成日期**: ${date}

---

## 页面总结

${summaryText}

---

${mindmapText || '## 思维导图\n\n（未生成思维导图）'}

---

*由 AI 网页学习助手生成*
`;
  }

  // ==================== 工具函数 ====================
  function getPageMeta() {
    return {
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || ''
    };
  }

  function extractPageContent() {
    const article = document.querySelector('article') || document.querySelector('main');
    const container = article || document.body;
    const excludeSelectors = 'script, style, nav, footer, header, aside, .sidebar, .nav, .menu, .advertisement, .ads, noscript, iframe, [role="navigation"], [role="banner"], [role="contentinfo"]';
    const clone = container.cloneNode(true);
    clone.querySelectorAll(excludeSelectors).forEach(el => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function truncateText(text, maxLength = 15000) {
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  }

  async function getConfig() {
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

  // ==================== 消息监听 ====================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'toggleWordSummary':
        wordSummaryEnabled = message.enabled;
        showToggleNotification(message.enabled);
        sendResponse({ success: true });
        break;
      case 'pageSummary':
        doPageSummary();
        sendResponse({ success: true });
        break;
      case 'getState':
        sendResponse({ wordSummaryEnabled });
        break;
      default:
        break;
    }
    return true;
  });

  function showToggleNotification(enabled) {
    const notification = document.createElement('div');
    notification.className = 'ai-notification';
    notification.textContent = enabled ? '✅ 划词总结已开启' : '⏸ 划词总结已关闭';
    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('visible'));
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // 初始化：检查划词总结状态
  chrome.runtime.sendMessage({ action: 'getWordSummaryState' }, (response) => {
    if (response) {
      wordSummaryEnabled = response.enabled;
    }
  });

  console.log('[AI网页学习助手] Content script 已加载');
})();
