/**
 * 轻量级 Markdown 转 HTML 解析器
 * 支持：标题(h1-h4)、代码块/行内代码、粗体/斜体、无序/有序列表、链接、引用、分割线
 * 原理：正则逐行替换，分两阶段处理 —— 第一阶段行内元素替换，第二阶段块级包裹
 */

/**
 * 将 Markdown 文本解析为 HTML
 * @param {string} md - Markdown 原始文本
 * @returns {string} 解析后的 HTML 字符串
 */
export function parseMarkdown(md) {
  if (!md) return ''

  let html = md

  // 第一阶段：HTML 实体转义，防止 XSS
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 代码块 ```lang\ncode\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    '<pre><code>' + code.trim() + '</code></pre>'
  )

  // 行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 标题 h4-h1（先匹配深层再浅层，避免 ## 被 h2 截断）
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 粗斜体 ***text***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // 粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 斜体 *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => '<ul>' + m + '</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '') // 合并相邻列表

  // 有序列表（用 <oli> 标记区分无序，第二阶段包裹 <ol>）
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')

  // 分割线
  html = html.replace(/^---$/gm, '<hr>')

  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

  // 引用 > text
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>')

  // 第二阶段：块级元素包裹（段落自动加 <p>，有序/无序列表分别合并）
  const lines = html.split('\n')
  const result = []
  let inList = false   // 是否在列表内
  let listClose = ''   // 当前列表的闭合标签 '</ul>' | '</ol>'

  for (const line of lines) {
    const l = line.trim()
    if (!l) {
      if (inList) { result.push(listClose); inList = false; listClose = '' }
      continue
    }
    // 已是块级标签，直接添加
    if (/^<(h[1-6]|ul|ol|pre|hr|blockquote)/.test(l)) {
      if (inList) { result.push(listClose); inList = false; listClose = '' }
      result.push(l)
      continue
    }
    // 有序列表项 <oli> → 包裹 <ol>
    if (/^<oli>/.test(l)) {
      if (!inList || listClose !== '</ol>') {
        if (inList) result.push(listClose)
        result.push('<ol>'); inList = true; listClose = '</ol>'
      }
      result.push('<li>' + l.slice(5, -6) + '</li>')
      continue
    }
    // 无序列表项 <li> → 包裹 <ul>
    if (/^<li>/.test(l)) {
      if (!inList || listClose !== '</ul>') {
        if (inList) result.push(listClose)
        result.push('<ul>'); inList = true; listClose = '</ul>'
      }
      result.push(l)
      continue
    }
    // 普通文本段落
    if (inList) { result.push(listClose); inList = false; listClose = '' }
    result.push('<p>' + l + '</p>')
  }

  if (inList) result.push(listClose)
  return result.join('\n')
}
