/**
 * 思维导图页面逻辑
 */

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('mindmapCanvas');
  const emptyHint = document.getElementById('mmEmpty');
  const summarySection = document.getElementById('mmSummary');
  const summaryContent = document.getElementById('mmSummaryContent');
  const pageTitleEl = document.getElementById('pageTitle');
  const btnDownload = document.getElementById('btnDownload');
  const btnBack = document.getElementById('btnBack');

  // 加载存储的数据
  chrome.storage.local.get(['mindmapData'], (result) => {
    const data = result.mindmapData;
    if (!data) {
      emptyHint.innerHTML = `
        <div class="mm-empty-icon">⚠️</div>
        <p>未找到总结数据，请先进行页面总结</p>
      `;
      return;
    }

    // 设置页面标题
    pageTitleEl.textContent = data.pageMeta?.title || '';

    // 解析思维导图
    const mindmapText = data.mindmapText || '';
    const treeData = parseMindmapMarkdown(mindmapText);

    if (treeData && treeData.length > 0) {
      emptyHint.style.display = 'none';
      const renderer = new MindMapRenderer('mindmapCanvas');
      renderer.render(treeData);
    } else {
      emptyHint.innerHTML = `
        <div class="mm-empty-icon">🗺️</div>
        <p>未能解析思维导图结构</p>
      `;
    }

    // 显示总结文本
    if (data.summaryText) {
      summarySection.style.display = 'block';
      summaryContent.innerHTML = data.summaryText
        .replace(/\n/g, '<br>')
        .replace(/### (.+)/g, '<h3>$1</h3>')
        .replace(/## (.+)/g, '<h2>$1</h2>')
        .replace(/# (.+)/g, '<h1>$1</h1>');
    }
  });

  // 下载 MD 按钮
  btnDownload.addEventListener('click', () => {
    chrome.storage.local.get(['mindmapData'], (result) => {
      const data = result.mindmapData;
      if (!data) return;

      const pageMeta = data.pageMeta || {};
      const mdContent = generateMarkdown(pageMeta, data.summaryText || '', data.mindmapText || '');
      const filename = `${pageMeta.title?.replace(/[\\/:*?"<>|]/g, '_') || '页面'}_总结.md`;

      // 通过 data URL 触发下载
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 按钮反馈
      btnDownload.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        已下载
      `;
      btnDownload.style.background = '#22c55e';
      setTimeout(() => {
        btnDownload.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          下载 MD
        `;
        btnDownload.style.background = '';
      }, 2000);
    });
  });

  // 返回按钮 - 关闭标签页
  btnBack.addEventListener('click', () => {
    window.close();
  });

  function generateMarkdown(pageMeta, summaryText, mindmapText) {
    const date = new Date().toISOString().split('T')[0];
    return `# ${pageMeta.title || '未命名页面'}

> **来源**: ${pageMeta.url || ''}
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
});

/**
 * 解析思维导图 Markdown 为树形结构
 * 支持两种格式：
 * 1. # ## ### 标题格式
 * 2. - 缩进列表格式（2空格缩进）
 */
function parseMindmapMarkdown(mdText) {
  if (!mdText) return [];

  const lines = mdText.trim().split('\n');
  const root = { name: 'Root', children: [] };
  const stack = [{ node: root, level: -1 }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === '## 思维导图' || trimmed === '# 思维导图') continue;

    let name = '';
    let level = 0;

    // 尝试 # 标题格式
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      level = headerMatch[1].length;
      name = headerMatch[2].replace(/\*\*/g, '').replace(/\*/g, '').trim();
    } else {
      // 尝试 - 或 * 列表格式（按缩进计算层级）
      const listMatch = trimmed.match(/^[\-\*]\s+(.+)/);
      if (listMatch) {
        const leadingSpaces = line.match(/^(\s*)/)[1].length;
        level = Math.floor(leadingSpaces / 2) + 1;
        name = listMatch[1].replace(/\*\*/g, '').replace(/\*/g, '').replace(/[:：]$/, '').trim();
      } else {
        continue;
      }
    }

    if (!name) continue;

    const newNode = { name, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(newNode);
    stack.push({ node: newNode, level });
  }

  return root.children.length > 0 ? root.children : [];
}
