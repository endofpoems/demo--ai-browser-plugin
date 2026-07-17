/**
 * 工具函数模块
 */

/**
 * 提取页面的主要内容文本
 */
function extractPageContent() {
  // 尝试获取 article 或 main 标签内容
  const article = document.querySelector('article') || document.querySelector('main');
  const container = article || document.body;

  // 排除脚本、样式、导航等无关元素
  const excludeSelectors = 'script, style, nav, footer, header, aside, .sidebar, .nav, .menu, .advertisement, .ads, noscript, iframe, [role="navigation"], [role="banner"], [role="contentinfo"]';

  const clone = container.cloneNode(true);
  clone.querySelectorAll(excludeSelectors).forEach(el => el.remove());

  const text = clone.textContent || '';
  // 清理多余空白
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 获取页面元信息
 */
function getPageMeta() {
  return {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.content || '',
    keywords: document.querySelector('meta[name="keywords"]')?.content || ''
  };
}

/**
 * 截断文本到指定长度
 */
function truncateText(text, maxLength = 15000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 解析思维导图 Markdown 为树形结构
 */
function parseMindmapMarkdown(mdText) {
  const lines = mdText.trim().split('\n').filter(line => line.trim());
  const root = { name: 'Root', children: [] };
  const stack = [{ node: root, level: -1 }];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (!match) continue;

    const level = match[1].length;
    const name = match[2].trim();

    const newNode = { name, children: [] };

    // 找到正确的父节点
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(newNode);
    stack.push({ node: newNode, level });
  }

  return root.children.length > 0 ? root.children : [{ name: '无内容', children: [] }];
}
