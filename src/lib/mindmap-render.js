/**
 * 思维导图渲染模块 - 基于 SVG
 */
export class MindMapRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.svgNS = 'http://www.w3.org/2000/svg'
    this.nodeWidth = 180
    this.nodeHeight = 50
    this.hGap = 60
    this.vGap = 30
    this.colors = [
      '#4A90D9', '#7B68EE', '#2EAC68', '#E8845C',
      '#D94A8C', '#5B8FB9', '#A855F7', '#16A34A',
      '#EA580C', '#DB2777'
    ]
  }

  render(treeData) {
    this.container.innerHTML = ''
    if (!treeData || treeData.length === 0) return

    const svg = document.createElementNS(this.svgNS, 'svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.overflow = 'visible'

    const layers = this._computeLayers(treeData)
    const offsetX = 60
    const offsetY = 100
    this._renderNodes(svg, treeData, layers, offsetX, offsetY, 0, null)

    const maxWidth = layers.length * (this.nodeWidth + this.hGap) + 100
    const maxHeight = Math.max(...layers.map(l => l.length)) * (this.nodeHeight + this.vGap) + 200
    svg.setAttribute('viewBox', `0 0 ${maxWidth} ${Math.max(maxHeight, 600)}`)

    this.container.appendChild(svg)
  }

  _computeLayers(tree) {
    const layers = []
    const queue = tree.map(node => ({ node, depth: 0 }))
    while (queue.length > 0) {
      const { node, depth } = queue.shift()
      if (!layers[depth]) layers[depth] = []
      layers[depth].push(node)
      if (node.children) {
        for (const child of node.children) {
          queue.push({ node: child, depth: depth + 1 })
        }
      }
    }
    return layers
  }

  _renderNodes(svg, nodes, layers, offsetX, offsetY, depth, parentPos) {
    if (!nodes || nodes.length === 0) return
    const layer = layers[depth]
    const startY = offsetY
    for (const node of nodes) {
      const idx = layer.indexOf(node)
      if (idx < 0) continue
      const x = offsetX + depth * (this.nodeWidth + this.hGap)
      const y = startY + idx * (this.nodeHeight + this.vGap)
      if (parentPos) {
        this._drawLine(svg, parentPos.x + this.nodeWidth, parentPos.y + this.nodeHeight / 2, x, y + this.nodeHeight / 2, depth)
      }
      const color = this.colors[depth % this.colors.length]
      this._drawNode(svg, x, y, node.name, color)
      if (node.children && node.children.length > 0) {
        this._renderNodes(svg, node.children, layers, offsetX, startY, depth + 1, { x, y })
      }
    }
  }

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
    textEl.setAttribute('font-family', 'Microsoft YaHei, PingFang SC, sans-serif')
    textEl.setAttribute('font-weight', '500')

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

  _drawLine(svg, x1, y1, x2, y2, depth) {
    const path = document.createElementNS(this.svgNS, 'path')
    const midX = (x1 + x2) / 2
    const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
    path.setAttribute('d', d)
    path.setAttribute('stroke', this.colors[depth % this.colors.length])
    path.setAttribute('stroke-width', 2)
    path.setAttribute('fill', 'none')
    path.setAttribute('opacity', '0.6')
    svg.insertBefore(path, svg.firstChild)
  }

  _darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const dr = Math.round(r * (1 - factor))
    const dg = Math.round(g * (1 - factor))
    const db = Math.round(b * (1 - factor))
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
  }
}
