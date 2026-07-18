/**
 * 工具函数模块
 */

/** 提取页面主要内容文本 */
export function extractPageContent() {
  const article = document.querySelector('article') || document.querySelector('main')
  const container = article || document.body
  const excludeSelectors = 'script, style, nav, footer, header, aside, .sidebar, .nav, .menu, .advertisement, .ads, noscript, iframe, [role="navigation"], [role="banner"], [role="contentinfo"]'
  const clone = container.cloneNode(true)
  clone.querySelectorAll(excludeSelectors).forEach(el => el.remove())
  return (clone.textContent || '').replace(/\s+/g, ' ').trim()
}

/** 获取页面元信息 */
export function getPageMeta() {
  return {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.content || '',
    keywords: document.querySelector('meta[name="keywords"]')?.content || ''
  }
}

/** 截断文本 */
export function truncateText(text, maxLength = 15000) {
  if (!text) return ''
  return text.length <= maxLength ? text : text.substring(0, maxLength) + '...'
}

/** 生成 Markdown 文件内容 */
export function generateMarkdown(pageMeta, summaryText, mindmapText) {
  const date = new Date().toISOString().split('T')[0]
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
`
}

/** 安全文件名 */
export function safeFilename(name) {
  return (name || '页面').replace(/[\\/:*?"<>|]/g, '_')
}

/** 解析 AI 返回结果：分离总结文本和思维导图 */
export function parseSummaryResult(result) {
  const mindmapIndex = result.indexOf('## 思维导图')
  if (mindmapIndex === -1) {
    return { summaryText: result.trim(), mindmapText: '' }
  }
  return {
    summaryText: result.substring(0, mindmapIndex).trim(),
    mindmapText: result.substring(mindmapIndex).trim()
  }
}

/**
 * 解析思维导图 Markdown 为带语义类型的树形结构
 * 支持格式：# 标题 / ## 🔍 维度名 (type) / ### 条目 / - 列表
 * 提取 icon + 语义类型 + 节点名
 * @param {string} mdText - AI 返回的思维导图 Markdown
 * @returns {Array<{ name, children, icon?, type? }>}
 */
export function parseMindmapMarkdown(mdText) {
  if (!mdText) return []

  const lines = mdText.trim().split('\n')
  const root = { name: 'Root', children: [] }
  const stack = [{ node: root, level: -1 }]

  // 节点类型 ↔ 颜色映射
  const TYPE_COLORS = {
    what: '#6366f1', why: '#8b5cf6', scenario: '#10b981',
    advantage: '#f59e0b', disadvantage: '#ef4444',
    point: '#3b82f6', relation: '#ec4899',
    default: '#6366f1'
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === '## 思维导图' || trimmed === '# 思维导图') continue

    let name = '', level = 0, icon = '', type = ''

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
    if (headerMatch) {
      level = headerMatch[1].length
      let raw = headerMatch[2].replace(/\*\*/g, '').replace(/\*/g, '').trim()

      // 提取类型标记 (type)
      const typeMatch = raw.match(/\((\w+)\)$/)
      if (typeMatch) {
        type = typeMatch[1].toLowerCase()
        raw = raw.replace(/\s*\(\w+\)$/, '').trim()
      }

      // 提取图标（## 层级的 emoji 作为 category icon）
      const iconMatch = raw.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{1F600}-\u{1F64F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6FF}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]\u{FE0F}?\s*)/u)
      if (iconMatch) {
        icon = iconMatch[1].trim()
        raw = raw.substring(iconMatch[1].length).trim()
      }

      name = raw
    } else {
      const listMatch = trimmed.match(/^[\-\*]\s+(.+)/)
      if (listMatch) {
        const leadingSpaces = line.match(/^(\s*)/)[1].length
        level = Math.floor(leadingSpaces / 2) + 1
        name = listMatch[1].replace(/\*\*/g, '').replace(/\*/g, '').replace(/[:：]$/, '').trim()
      } else {
        continue
      }
    }

    if (!name) continue

    const newNode = { name, children: [], icon, type, color: TYPE_COLORS[type] || TYPE_COLORS.default }
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1].node
    parent.children.push(newNode)
    stack.push({ node: newNode, level })
  }

  return root.children.length > 0 ? root.children : []
}
