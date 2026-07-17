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

/** 解析思维导图 Markdown 为树形结构（支持 # 标题和 - 列表格式） */
export function parseMindmapMarkdown(mdText) {
  if (!mdText) return []

  const lines = mdText.trim().split('\n')
  const root = { name: 'Root', children: [] }
  const stack = [{ node: root, level: -1 }]

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === '## 思维导图' || trimmed === '# 思维导图') continue

    let name = ''
    let level = 0

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
    if (headerMatch) {
      level = headerMatch[1].length
      name = headerMatch[2].replace(/\*\*/g, '').replace(/\*/g, '').trim()
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

    const newNode = { name, children: [] }
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1].node
    parent.children.push(newNode)
    stack.push({ node: newNode, level })
  }

  return root.children.length > 0 ? root.children : []
}
