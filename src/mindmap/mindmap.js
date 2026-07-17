/**
 * 思维导图页面逻辑（纯 JS）
 */
(function () {
  'use strict'

  // ====== SVG 思维导图渲染器（内联） ======
  class MindMapRenderer {
    constructor(containerId) {
      this.container = document.getElementById(containerId)
      this.svgNS = 'http://www.w3.org/2000/svg'
      this.nodeWidth = 180
      this.nodeHeight = 50
      this.hGap = 60
      this.vGap = 30
      this.colors = ['#4A90D9','#7B68EE','#2EAC68','#E8845C','#D94A8C','#5B8FB9','#A855F7','#16A34A','#EA580C','#DB2777']
    }

    render(treeData) {
      this.container.innerHTML = ''
      if (!treeData || treeData.length === 0) return
      const svg = document.createElementNS(this.svgNS, 'svg')
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.style.overflow = 'visible'
      const layers = this._computeLayers(treeData)
      this._renderNodes(svg, treeData, layers, 60, 100, 0, null)
      const maxW = layers.length * (this.nodeWidth + this.hGap) + 100
      const maxH = Math.max(...layers.map(l => l.length)) * (this.nodeHeight + this.vGap) + 200
      svg.setAttribute('viewBox', '0 0 ' + maxW + ' ' + Math.max(maxH, 600))
      this.container.appendChild(svg)
    }

    _computeLayers(tree) {
      const layers = []
      const queue = tree.map(node => ({ node, depth: 0 }))
      while (queue.length) {
        const { node, depth } = queue.shift()
        if (!layers[depth]) layers[depth] = []
        layers[depth].push(node)
        if (node.children) node.children.forEach(child => queue.push({ node: child, depth: depth + 1 }))
      }
      return layers
    }

    _renderNodes(svg, nodes, layers, ox, oy, depth, parentPos) {
      if (!nodes || !nodes.length) return
      const layer = layers[depth]
      for (const node of nodes) {
        const idx = layer.indexOf(node)
        if (idx < 0) continue
        const x = ox + depth * (this.nodeWidth + this.hGap)
        const y = oy + idx * (this.nodeHeight + this.vGap)
        if (parentPos) this._drawLine(svg, parentPos.x + this.nodeWidth, parentPos.y + this.nodeHeight / 2, x, y + this.nodeHeight / 2, depth)
        this._drawNode(svg, x, y, node.name, this.colors[depth % this.colors.length])
        if (node.children && node.children.length) this._renderNodes(svg, node.children, layers, ox, oy, depth + 1, { x, y })
      }
    }

    _drawNode(svg, x, y, text, color) {
      const g = document.createElementNS(this.svgNS, 'g')
      const rect = document.createElementNS(this.svgNS, 'rect')
      rect.setAttribute('x', x); rect.setAttribute('y', y)
      rect.setAttribute('width', this.nodeWidth); rect.setAttribute('height', this.nodeHeight)
      rect.setAttribute('rx', 10); rect.setAttribute('ry', 10)
      rect.setAttribute('fill', color); rect.setAttribute('stroke', this._darken(color, 0.2))
      rect.setAttribute('stroke-width', 2); rect.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))'
      const textEl = document.createElementNS(this.svgNS, 'text')
      textEl.setAttribute('x', x + this.nodeWidth / 2); textEl.setAttribute('y', y + this.nodeHeight / 2 + 5)
      textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('fill', '#ffffff')
      textEl.setAttribute('font-size', '14'); textEl.setAttribute('font-family', 'Microsoft YaHei,PingFang SC,sans-serif')
      textEl.setAttribute('font-weight', '500')
      const maxChars = Math.floor(this.nodeWidth / 14) - 2
      if (text.length > maxChars) {
        textEl.textContent = text.substring(0, maxChars)
        const tspan = document.createElementNS(this.svgNS, 'tspan')
        tspan.setAttribute('x', x + this.nodeWidth / 2); tspan.setAttribute('dy', '18')
        tspan.textContent = text.substring(maxChars, maxChars * 2) || ''
        textEl.appendChild(tspan)
      } else { textEl.textContent = text }
      g.appendChild(rect); g.appendChild(textEl); svg.appendChild(g)
    }

    _drawLine(svg, x1, y1, x2, y2, depth) {
      const path = document.createElementNS(this.svgNS, 'path')
      const midX = (x1 + x2) / 2
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + midX + ' ' + y1 + ', ' + midX + ' ' + y2 + ', ' + x2 + ' ' + y2)
      path.setAttribute('stroke', this.colors[depth % this.colors.length])
      path.setAttribute('stroke-width', 2); path.setAttribute('fill', 'none'); path.setAttribute('opacity', '0.6')
      svg.insertBefore(path, svg.firstChild)
    }

    _darken(hex, factor) {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      return '#' + [r,g,b].map(v => Math.round(v*(1-factor)).toString(16).padStart(2,'0')).join('')
    }
  }

  const canvas = document.getElementById('mindmapCanvas')
  const emptyHint = document.getElementById('mmEmpty')
  const summarySection = document.getElementById('mmSummary')
  const summaryContent = document.getElementById('mmSummaryContent')
  const pageTitleEl = document.getElementById('pageTitle')
  const btnDownload = document.getElementById('btnDownload')
  const btnBack = document.getElementById('btnBack')

  let mdContent = ''
  let cachedPageMeta = null

  // ====== 工具函数（内联，避免 ES Module 依赖） ======

  function parseMindmapMarkdown(mdText) {
    if (!mdText) return []
    const lines = mdText.trim().split('\n')
    const root = { name: 'Root', children: [] }
    const stack = [{ node: root, level: -1 }]
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed === '## 思维导图' || trimmed === '# 思维导图') continue
      let name = '', level = 0
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
        } else continue
      }
      if (!name) continue
      const newNode = { name, children: [] }
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
      const parent = stack[stack.length - 1].node
      parent.children.push(newNode)
      stack.push({ node: newNode, level })
    }
    return root.children.length > 0 ? root.children : []
  }

  function generateMarkdown(pageMeta, summaryText, mindmapText) {
    const date = new Date().toISOString().split('T')[0]
    return '# ' + (pageMeta.title || '未命名页面') +
      '\n\n> **来源**: ' + (pageMeta.url || '') +
      '\n> **生成日期**: ' + date +
      '\n\n---\n\n## 页面总结\n\n' + summaryText +
      '\n\n---\n\n' + (mindmapText || '## 思维导图\n\n（未生成思维导图）') +
      '\n\n---\n\n*由 AI 网页学习助手生成*\n'
  }

  function safeFilename(name) {
    return (name || '页面').replace(/[\\/:*?"<>|]/g, '_')
  }

  function summaryToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/# (.+)/g, '<h1>$1</h1>')
  }

  // ====== 初始化 ======
  chrome.storage.local.get(['mindmapData'], function (result) {
    const data = result.mindmapData
    if (!data) {
      emptyHint.innerHTML = '<div class="mm-empty-icon">&#x26A0;&#xFE0F;</div><p>未找到总结数据，请先进行页面总结</p>'
      return
    }

    cachedPageMeta = data.pageMeta || {}
    pageTitleEl.textContent = cachedPageMeta.title || ''

    // 解析并渲染思维导图
    const mindmapText = data.mindmapText || ''
    const treeData = parseMindmapMarkdown(mindmapText)

    if (treeData && treeData.length > 0) {
      try {
        emptyHint.style.display = 'none'
        const renderer = new MindMapRenderer('mindmapCanvas')
        renderer.render(treeData)
      } catch (err) {
        emptyHint.innerHTML = '<div class="mm-empty-icon">&#x26A0;&#xFE0F;</div><p>渲染失败: ' + err.message + '</p>'
      }
    } else {
      emptyHint.innerHTML = '<div class="mm-empty-icon">&#x1F5FA;&#xFE0F;</div><p>暂无思维导图数据</p>'
    }

    // 显示总结文本
    if (data.summaryText) {
      summarySection.style.display = 'block'
      summaryContent.innerHTML = summaryToHtml(data.summaryText)
    }

    // 生成 MD 内容
    mdContent = generateMarkdown(cachedPageMeta, data.summaryText || '', mindmapText)
  })

  // ====== 下载按钮 ======
  btnDownload.addEventListener('click', function () {
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeFilename(cachedPageMeta?.title) + '_总结.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    btnDownload.textContent = '已下载'
    btnDownload.disabled = true
    setTimeout(function () {
      btnDownload.textContent = '下载 MD'
      btnDownload.disabled = false
    }, 2000)
  })

  // ====== 返回按钮 ======
  btnBack.addEventListener('click', function () { window.close() })
})()
