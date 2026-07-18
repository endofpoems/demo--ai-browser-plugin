/**
 * 思维导图页面逻辑（纯 JS IIFE）
 * 说明：因 CRXJS/Vite 不编译 web_accessible_resources 中的 HTML，此文件为纯 JS 实现
 * 功能：从 chrome.storage.local 读取数据 → 解析 Markdown → SVG 渲染 → 支持下载 MD
 */
(function () {
  'use strict'

  // ====== SVG 思维导图渲染器 ======
  /**
   * 基于 SVG 的思维导图渲染类
   * 原理：BFS 计算节点层级 → 递归绘制 SVG <rect> + <text> + 贝塞尔曲线连线
   * 优点：无第三方依赖，轻量级，支持缩放
   * 缺点：大量节点时性能下降，不支持交互编辑
   */
  class MindMapRenderer {
    constructor(containerId) {
      this.container = document.getElementById(containerId)
      this.svgNS = 'http://www.w3.org/2000/svg'
      this.nodeWidth = 180   // 节点宽度
      this.nodeHeight = 50   // 节点高度
      this.hGap = 60         // 水平间距
      this.vGap = 30         // 垂直间距
      this.colors = ['#4A90D9','#7B68EE','#2EAC68','#E8845C','#D94A8C','#5B8FB9','#A855F7','#16A34A','#EA580C','#DB2777']
    }

    /** 渲染入口：清空容器 → 计算层级 → 绘制 → 设置 SVG viewBox */
    render(treeData) {
      this.container.innerHTML = ''
      if (!treeData || treeData.length === 0) return

      const svg = document.createElementNS(this.svgNS, 'svg')
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.style.overflow = 'visible'

      const layers = this._computeLayers(treeData)
      this._renderNodes(svg, treeData, layers, 60, 100, 0, null)

      // 自适应 SVG 画布尺寸
      const maxW = layers.length * (this.nodeWidth + this.hGap) + 100
      const maxH = Math.max(...layers.map(l => l.length)) * (this.nodeHeight + this.vGap) + 200
      svg.setAttribute('viewBox', '0 0 ' + maxW + ' ' + Math.max(maxH, 600))
      this.container.appendChild(svg)
    }

    /** BFS 层级计算：将树形结构按深度分层 */
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

    /** 递归绘制节点和连线 */
    _renderNodes(svg, nodes, layers, ox, oy, depth, parentPos) {
      if (!nodes || !nodes.length) return
      const layer = layers[depth]
      for (const node of nodes) {
        const idx = layer.indexOf(node)
        if (idx < 0) continue

        const x = ox + depth * (this.nodeWidth + this.hGap)
        const y = oy + idx * (this.nodeHeight + this.vGap)

        // 绘制父节点到当前节点的贝塞尔连线
        if (parentPos) {
          this._drawLine(svg, parentPos.x + this.nodeWidth, parentPos.y + this.nodeHeight / 2, x, y + this.nodeHeight / 2, depth)
        }

        // 绘制节点（矩形 + 文字）
        this._drawNode(svg, x, y, node.name, this.colors[depth % this.colors.length])

        // 递归子节点
        if (node.children && node.children.length) {
          this._renderNodes(svg, node.children, layers, ox, oy, depth + 1, { x, y })
        }
      }
    }

    /** 绘制单个节点：圆角矩形 + 居中文案，长文本自动折行 */
    _drawNode(svg, x, y, text, color) {
      const g = document.createElementNS(this.svgNS, 'g')
      const rect = document.createElementNS(this.svgNS, 'rect')
      rect.setAttribute('x', x)
      rect.setAttribute('y', y)
      rect.setAttribute('width', this.nodeWidth)
      rect.setAttribute('height', this.nodeHeight)
      rect.setAttribute('rx', 10)
      rect.setAttribute('ry', 10)
      rect.setAttribute('fill', color)
      rect.setAttribute('stroke', this._darken(color, 0.2))
      rect.setAttribute('stroke-width', 2)
      rect.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))'

      const textEl = document.createElementNS(this.svgNS, 'text')
      textEl.setAttribute('x', x + this.nodeWidth / 2)
      textEl.setAttribute('y', y + this.nodeHeight / 2 + 5)
      textEl.setAttribute('text-anchor', 'middle')
      textEl.setAttribute('fill', '#ffffff')
      textEl.setAttribute('font-size', '14')
      textEl.setAttribute('font-family', 'Microsoft YaHei,PingFang SC,sans-serif')
      textEl.setAttribute('font-weight', '500')

      // 长文本折行处理
      const maxChars = Math.floor(this.nodeWidth / 14) - 2
      if (text.length > maxChars) {
        textEl.textContent = text.substring(0, maxChars)
        const tspan = document.createElementNS(this.svgNS, 'tspan')
        tspan.setAttribute('x', x + this.nodeWidth / 2)
        tspan.setAttribute('dy', '18')
        tspan.textContent = text.substring(maxChars, maxChars * 2) || ''
        textEl.appendChild(tspan)
      } else {
        textEl.textContent = text
      }

      g.appendChild(rect)
      g.appendChild(textEl)
      svg.appendChild(g)
    }

    /** 绘制三次贝塞尔曲线连线（平滑 S 形） */
    _drawLine(svg, x1, y1, x2, y2, depth) {
      const path = document.createElementNS(this.svgNS, 'path')
      const midX = (x1 + x2) / 2
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + midX + ' ' + y1 + ', ' + midX + ' ' + y2 + ', ' + x2 + ' ' + y2)
      path.setAttribute('stroke', this.colors[depth % this.colors.length])
      path.setAttribute('stroke-width', 2)
      path.setAttribute('fill', 'none')
      path.setAttribute('opacity', '0.6')
      // 连线置于节点下方
      svg.insertBefore(path, svg.firstChild)
    }

    /** HEX 颜色变暗工具函数 */
    _darken(hex, factor) {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      return '#' + [r,g,b].map(v => Math.round(v*(1-factor)).toString(16).padStart(2,'0')).join('')
    }
  }

  // ====== DOM 引用 ======
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

  /**
   * 解析思维导图 Markdown 为树形结构
   * 支持：Markdown 标题格式（#/##/###）和列表格式（- / *）
   * 原理：栈式层级管理 —— 逐行读取，根据 # 数量或缩进确定层级，栈顶为父节点
   * @param {string} mdText - 思维导图 Markdown 文本
   * @returns {Array} 树形节点数组 [{ name, children }]
   */
  function parseMindmapMarkdown(mdText) {
    if (!mdText) return []

    const lines = mdText.trim().split('\n')
    const root = { name: 'Root', children: [] }
    const stack = [{ node: root, level: -1 }] // 栈：记录当前路径上的所有节点

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed === '## 思维导图' || trimmed === '# 思维导图') continue

      let name = '', level = 0

      // 匹配 Markdown 标题: # Title / ## Subtitle
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
      if (headerMatch) {
        level = headerMatch[1].length
        name = headerMatch[2].replace(/\*\*/g, '').replace(/\*/g, '').trim()
      } else {
        // 匹配列表项: - item / * item
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

      // 回退到正确层级的父节点（关键：栈式管理确保层级正确）
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      const parent = stack[stack.length - 1].node
      parent.children.push(newNode)
      stack.push({ node: newNode, level })
    }

    return root.children.length > 0 ? root.children : []
  }

  /** 生成完整 Markdown 文档内容（用于下载） */
  function generateMarkdown(pageMeta, summaryText, mindmapText) {
    const date = new Date().toISOString().split('T')[0]
    return '# ' + (pageMeta.title || '未命名页面') +
      '\n\n> **来源**: ' + (pageMeta.url || '') +
      '\n> **生成日期**: ' + date +
      '\n\n---\n\n## 页面总结\n\n' + summaryText +
      '\n\n---\n\n' + (mindmapText || '## 思维导图\n\n（未生成思维导图）') +
      '\n\n---\n\n*由 AI 网页学习助手生成*\n'
  }

  /** 安全文件名：过滤 Windows/Mac 非法字符 */
  function safeFilename(name) {
    return (name || '页面').replace(/[\\/:*?"<>|]/g, '_')
  }

  /** 总结文本转为简单 HTML（用于页面内显示） */
  function summaryToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/# (.+)/g, '<h1>$1</h1>')
  }

  // ====== 初始化：从 storage 读取数据并渲染 ======
  chrome.storage.local.get(['mindmapData'], function (result) {
    const data = result.mindmapData
    if (!data) {
      emptyHint.innerHTML = '<div class="mm-empty-icon">&#x26A0;&#xFE0F;</div><p>未找到总结数据，请先进行页面总结</p>'
      return
    }

    cachedPageMeta = data.pageMeta || {}
    pageTitleEl.textContent = cachedPageMeta.title || ''

    // 解析思维导图 Markdown 并渲染 SVG
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

    // 显示原始总结文本
    if (data.summaryText) {
      summarySection.style.display = 'block'
      summaryContent.innerHTML = summaryToHtml(data.summaryText)
    }

    // 预生成 MD 内容供下载
    mdContent = generateMarkdown(cachedPageMeta, data.summaryText || '', mindmapText)
  })

  // ====== 下载按钮：将 MD 内容保存为 .md 文件 ======
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

    // 2 秒防重复
    btnDownload.textContent = '已下载'
    btnDownload.disabled = true
    setTimeout(function () {
      btnDownload.textContent = '下载 MD'
      btnDownload.disabled = false
    }, 2000)
  })

  // ====== 返回按钮：关闭当前 Tab ======
  btnBack.addEventListener('click', function () { window.close() })
})()
