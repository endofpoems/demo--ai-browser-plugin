/**
 * 轻量级 Markdown 转 HTML 解析器
 */
export function parseMarkdown(md) {
  if (!md) return ''
  let html = md
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => '<pre><code>' + code.trim() + '</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => '<ul>' + m + '</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>')

  const lines = html.split('\n')
  const result = []
  let inList = false
  for (const line of lines) {
    const l = line.trim()
    if (!l) { if (inList) { result.push('</ul>'); inList = false }; continue }
    if (/^<(h[1-6]|ul|ol|li|pre|hr|blockquote)/.test(l)) { result.push(l); continue }
    if (!inList && !/^<li>/.test(l)) { result.push('<p>' + l + '</p>') }
    else if (/^<li>/.test(l)) { if (!inList) { result.push('<ul>'); inList = true }; result.push(l) }
  }
  if (inList) result.push('</ul>')
  return result.join('\n')
}
