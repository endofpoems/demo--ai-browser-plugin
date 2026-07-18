<template>
  <div id="ai-content-app">
    <!-- 划词链式 Tooltip（可拖拽 + 可关闭） -->
    <div
      v-for="(tip, idx) in tooltipChain"
      :key="tip.id"
      class="ai-tooltip-container"
      :class="{ visible: !tip._closing }"
      :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
    >
      <div class="ai-tooltip-frame">
        <div
          class="ai-tooltip-header ai-tooltip-drag"
          @mousedown.stop="onTooltipDragStart($event, tip)"
        >
          <span class="ai-tooltip-icon">&#9670;</span>
          <span class="ai-tooltip-title">{{ idx === 0 ? 'AI 划词总结' : '链式解释 #' + (idx + 1) }}</span>
          <button class="ai-tooltip-close-btn" @mousedown.stop @click.stop="closeTooltip(idx)" title="关闭">&#10005;</button>
        </div>
        <div class="ai-tooltip-divider"></div>
        <div class="ai-tooltip-body">
          <div v-if="tip.loading" class="ai-tooltip-loading">
            <span class="ai-tooltip-spinner"></span>正在分析...
          </div>
          <div v-else class="ai-tooltip-content">{{ tip.summary }}</div>
          <div v-if="!tip.loading && tip.label" class="ai-tooltip-label">源：{{ tip.label }}</div>
        </div>
      </div>
    </div>

    <!-- 通知 -->
    <Transition name="notify">
      <div v-if="notification.text" class="ai-notification" :class="notification.type">{{ notification.text }}</div>
    </Transition>

    <!-- 进度遮罩 -->
    <div v-if="showOverlay" class="ai-overlay">
      <div class="ai-overlay-card">
        <div class="ai-overlay-spinner"></div>
        <div class="ai-overlay-text">AI 正在分析页面内容...</div>
        <div class="ai-overlay-sub">这可能需要几秒钟</div>
      </div>
    </div>

    <!-- 结果面板（可拖拽 + 可调整大小） -->
    <div v-if="showPanel" class="ai-result-panel visible" :style="panelStyle" ref="panelRef">
      <!-- 箭头按钮（导图未展开时显示在面板边框） -->
      <div v-if="!showMindmapPanel && showLeftArrow"
        class="ai-mindmap-arrow ai-mindmap-arrow-left"
        @click.stop="toggleMindmap" title="展开思维导图">&#9664;</div>
      <div v-if="!showMindmapPanel && showRightArrow"
        class="ai-mindmap-arrow ai-mindmap-arrow-right"
        @click.stop="toggleMindmap" title="展开思维导图">&#9654;</div>

      <div class="ai-result-header" @mousedown="onPanelDragStart">
        <h2>页面总结</h2>
        <button class="ai-result-close" @click="closePanel">&times;</button>
      </div>
      <div class="ai-result-body">
        <div class="ai-result-summary" v-html="resultHtml"></div>
        <div class="ai-result-actions">
          <button class="ai-btn ai-btn-download" @click="downloadMd" :disabled="downloadDone">
            {{ downloadDone ? '已触发下载' : '下载 MD 文件' }}
          </button>
          <button class="ai-btn ai-btn-cancel" @click="closePanel">关闭</button>
        </div>
      </div>
      <div class="ai-resize-handle" @mousedown.stop="onResizeStart"></div>
    </div>

    <!-- 思维导图侧滑面板 -->
    <div v-if="showMindmapPanel" class="ai-mindmap-slide" :class="mindmapAnimClass" :style="mindmapSlideStyle">
      <!-- 收回箭头（在导图面板的外边缘） -->
      <div class="ai-mindmap-arrow ai-mindmap-arrow-close"
        :class="mindmapAnimClass === 'ai-mindmap-expand-right' ? 'ai-mindmap-arrow-left' : 'ai-mindmap-arrow-right'"
        @click.stop="toggleMindmap" title="收回思维导图">
        {{ mindmapAnimClass === 'ai-mindmap-expand-right' ? '&#9654;' : '&#9664;' }}
      </div>
      <div class="ai-mindmap-slide-header">
        <h2>思维导图</h2>
        <button class="ai-result-close" @click="toggleMindmap">&times;</button>
      </div>
      <div class="ai-mindmap-slide-body">
        <div v-if="mindmapLoading" class="ai-mindmap-loading">
          <span class="ai-tooltip-spinner"></span>正在生成思维导图...
        </div>
        <div v-else-if="mindmapSvgContent" class="ai-mindmap-svg-wrap" v-html="mindmapSvgContent"></div>
        <div v-else class="ai-mindmap-empty">暂无思维导图数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AI 网页学习助手 - Content Script 主组件
 * 功能：划词链式解释、可拖拽+resize面板、思维导图侧滑（放射状）、智能导图生成
 */
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { aiService } from '../lib/ai.js'
import { getPageMeta, extractPageContent, truncateText, generateMarkdown, safeFilename, parseSummaryResult, parseMindmapMarkdown } from '../lib/utils.js'
import { parseMarkdown } from '../lib/markdown.js'

// ====== 划词链式解释 ======
const wordSummaryEnabled = ref(false)
const tooltipChain = reactive([])
const TOOLTIP_W = 320, TOOLTIP_OFFSET_X = 30, TOOLTIP_OFFSET_Y = 40
let preventNextTooltip = false // 防止×按钮触发 mouseup 冒新弹窗

function hitTooltip(e) {
  return Array.from(document.querySelectorAll('.ai-tooltip-container')).some(el => el.contains(e.target))
}

async function onMouseUp(e) {
  if (!wordSummaryEnabled.value || preventNextTooltip) { preventNextTooltip = false; return }
  const selection = window.getSelection()
  const text = selection.toString().trim()
  if (!text || text.length > 300) return

  // 计算位置
  let px, py
  if (tooltipChain.length > 0) {
    const last = tooltipChain[tooltipChain.length - 1]
    px = last.x + TOOLTIP_OFFSET_X; py = last.y + TOOLTIP_OFFSET_Y
  } else {
    px = e.clientX + 15; py = e.clientY - 10
  }
  if (px + TOOLTIP_W > window.innerWidth - 10) px = window.innerWidth - TOOLTIP_W - 10
  if (px < 5) px = 5
  if (py + 200 > window.innerHeight - 10) py = window.innerHeight - 210
  if (py < 5) py = 5

  const tipId = Date.now()
  const newTip = reactive({ id: tipId, label: text, summary: '', x: px, y: py, loading: true })
  tooltipChain.push(newTip)

  try {
    const sourceText = tooltipChain.length > 1 ? tooltipChain[tooltipChain.length - 2].summary : text
    const result = await aiService.summarizeWord(sourceText)
    newTip.summary = result.replace(/["""]/g, '').trim()
  } catch (err) {
    newTip.summary = '分析失败: ' + err.message
  } finally {
    newTip.loading = false
  }
}

function onMouseDown(e) {
  if (tooltipChain.length > 0 && draggingTipId === null) {
    nextTick(() => { if (!hitTooltip(e)) tooltipChain.length = 0 })
  }
}

// --- Tooltip 拖拽 ---
let draggingTipId = null
let tipDragStartX = 0, tipDragStartY = 0, tipStartX = 0, tipStartY = 0

function onTooltipDragStart(e, tip) {
  if (e.target.closest('.ai-tooltip-close-btn')) return
  draggingTipId = tip.id
  tipDragStartX = e.clientX; tipDragStartY = e.clientY
  tipStartX = tip.x; tipStartY = tip.y
  document.addEventListener('mousemove', onTooltipDragMove)
  document.addEventListener('mouseup', onTooltipDragEnd)
}
function onTooltipDragMove(e) {
  if (!draggingTipId) return
  const tip = tooltipChain.find(t => t.id === draggingTipId)
  if (!tip) return
  tip.x = Math.max(5, Math.min(window.innerWidth - 310, tipStartX + e.clientX - tipDragStartX))
  tip.y = Math.max(5, Math.min(window.innerHeight - 60, tipStartY + e.clientY - tipDragStartY))
}
function onTooltipDragEnd() {
  draggingTipId = null
  document.removeEventListener('mousemove', onTooltipDragMove)
  document.removeEventListener('mouseup', onTooltipDragEnd)
}

function closeTooltip(idx) {
  preventNextTooltip = true // 阻止本次 mouseup 冒新弹窗
  tooltipChain.splice(idx, 1)
}

// ====== 页面总结（可拖拽 + 可调整大小） ======
const showOverlay = ref(false)
const showPanel = ref(false)
const resultHtml = ref('')
const downloadDone = ref(false)
const panelRef = ref(null)

const panelStyle = reactive({
  left: 'auto', top: '5%', right: '5%', bottom: '5%',
  width: '520px', minWidth: '320px', minHeight: '300px'
})

// --- 拖拽 ---
let isDragging = false, dragStartX = 0, dragStartY = 0, panelStartLeft = 0, panelStartTop = 0

function onPanelDragStart(e) {
  if (e.target.closest('.ai-result-close') || e.target.closest('.ai-resize-handle')) return
  isDragging = true
  const rect = panelRef.value.getBoundingClientRect()
  dragStartX = e.clientX; dragStartY = e.clientY
  panelStartLeft = rect.left; panelStartTop = rect.top
  panelStyle.right = 'auto'; panelStyle.bottom = 'auto'
  panelStyle.left = panelStartLeft + 'px'; panelStyle.top = panelStartTop + 'px'
  panelStyle.width = rect.width + 'px'
  document.addEventListener('mousemove', onPanelDragMove)
  document.addEventListener('mouseup', onPanelDragEnd)
}
function onPanelDragMove(e) {
  if (!isDragging) return
  let nl = panelStartLeft + (e.clientX - dragStartX), nt = panelStartTop + (e.clientY - dragStartY)
  nl = Math.max(0, Math.min(nl, window.innerWidth - 60))
  nt = Math.max(0, Math.min(nt, window.innerHeight - 60))
  panelStyle.left = nl + 'px'; panelStyle.top = nt + 'px'
  if (showMindmapPanel.value) syncMindmapPosition()
  updateArrowDirection()
}
function onPanelDragEnd() {
  isDragging = false
  document.removeEventListener('mousemove', onPanelDragMove)
  document.removeEventListener('mouseup', onPanelDragEnd)
}

// --- Resize ---
let isResizing = false, resizeStartX = 0, resizeStartY = 0, resizeStartW = 0, resizeStartH = 0

function onResizeStart(e) {
  isResizing = true
  const rect = panelRef.value.getBoundingClientRect()
  resizeStartX = e.clientX; resizeStartY = e.clientY
  resizeStartW = rect.width; resizeStartH = rect.height
  panelStartLeft = rect.left; panelStartTop = rect.top
  panelStyle.left = rect.left + 'px'; panelStyle.top = rect.top + 'px'
  panelStyle.right = 'auto'; panelStyle.bottom = 'auto'
  panelStyle.width = rect.width + 'px'; panelStyle.height = rect.height + 'px'
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}
function onResizeMove(e) {
  if (!isResizing) return
  let nw = resizeStartW + (e.clientX - resizeStartX), nh = resizeStartH + (e.clientY - resizeStartY)
  nw = Math.max(320, Math.min(nw, window.innerWidth - panelStartLeft - 10))
  nh = Math.max(300, Math.min(nh, window.innerHeight - panelStartTop - 10))
  panelStyle.width = nw + 'px'; panelStyle.height = nh + 'px'
}
function onResizeEnd() {
  isResizing = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  updateArrowDirection()
  if (showMindmapPanel.value) syncMindmapPosition()
}

// ====== 箭头方向 ======
const showLeftArrow = ref(false)
const showRightArrow = ref(true)

function updateArrowDirection() {
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  showLeftArrow.value = centerX >= window.innerWidth / 2
  showRightArrow.value = centerX < window.innerWidth / 2
}

// ====== 思维导图（放射状 + 跟随Resize + 缓存） ======
const showMindmapPanel = ref(false)
const mindmapLoading = ref(false)
const mindmapSvgContent = ref('')
const mindmapAnimClass = ref('')
const mindmapSlideStyle = reactive({ left: '0px', top: '5%', width: '0px', height: '90%' })

let cachedMdContent = ''
let cachedMindmapText = ''
let cachedPageMeta = null
let cachedSummaryText = ''
let cachedMindmapSvg = ''    // 缓存已渲染的 SVG，再次打开不重载
let cachedMindmapIsTech = false

/** 思维导图跟随面板同步位置+尺寸 */
function syncMindmapPosition() {
  if (!panelRef.value || !showMindmapPanel.value) return
  const pr = panelRef.value.getBoundingClientRect()
  const mmW = pr.width // 导图宽度跟随面板宽度
  mindmapSlideStyle.width = mmW + 'px'
  if (mindmapAnimClass.value === 'ai-mindmap-expand-right') {
    mindmapSlideStyle.left = (pr.right + 4) + 'px'
  } else {
    mindmapSlideStyle.left = Math.max(4, pr.left - mmW - 4) + 'px'
  }
  mindmapSlideStyle.top = pr.top + 'px'
  mindmapSlideStyle.height = pr.height + 'px'
  // 重新渲染以适应新尺寸
  if (cachedMindmapText) {
    const treeData = parseMindmapMarkdown(cachedMindmapText)
    if (treeData && treeData.length > 0) {
      const finalTree = cachedMindmapIsTech ? treeData : limitTreeNodes(treeData, 10)
      cachedMindmapSvg = renderMindmapRadial(finalTree)
      if (!mindmapLoading.value) mindmapSvgContent.value = cachedMindmapSvg
    }
  }
}

function hasTechTerms(text) {
  const techs = ['框架','架构','方案','技术','算法','协议','引擎','平台','系统','模式','模型','组件','库','工具','中间件','framework','architecture','pattern','algorithm','protocol','Vue','React','Angular','Node','Spring','Django','Flask','Kubernetes','Docker','Redis','MySQL','MongoDB','GraphQL','REST','gRPC','WebSocket','HTTP','TCP','微服务','分布式','容器','虚拟','云计算','AI','ML','深度学习','神经网络']
  return techs.some(p => text.toLowerCase().includes(p.toLowerCase()))
}

async function doPageSummary() {
  showOverlay.value = true
  try {
    const pageMeta = getPageMeta()
    const pageContent = extractPageContent()
    const result = await aiService.summarizePage(pageMeta, truncateText(pageContent, 15000))
    const { summaryText, mindmapText } = parseSummaryResult(result)
    cachedMdContent = generateMarkdown(pageMeta, summaryText, mindmapText)
    cachedMindmapText = mindmapText
    cachedPageMeta = pageMeta
    cachedSummaryText = summaryText
    cachedMindmapSvg = '' // 清除缓存
    resultHtml.value = parseMarkdown(summaryText)
    showOverlay.value = false; showPanel.value = true; downloadDone.value = false
    nextTick(() => updateArrowDirection())
  } catch (err) { showOverlay.value = false; notify(err.message, 'error') }
}

function closePanel() { showPanel.value = false; showMindmapPanel.value = false }

/** 切换思维导图：有缓存直接显示，无缓存才加载 */
async function toggleMindmap() {
  if (showMindmapPanel.value) {
    // 收回
    mindmapSlideStyle.width = '0px'
    setTimeout(() => { showMindmapPanel.value = false }, 400)
    return
  }

  if (!panelRef.value) return
  const pr = panelRef.value.getBoundingClientRect()
  showMindmapPanel.value = true

  // 位置与尺寸初始化
  const mmW = pr.width
  if (showRightArrow.value) {
    mindmapSlideStyle.left = (pr.right + 4) + 'px'
    mindmapAnimClass.value = 'ai-mindmap-expand-right'
  } else {
    mindmapSlideStyle.left = Math.max(4, pr.left - mmW - 4) + 'px'
    mindmapAnimClass.value = 'ai-mindmap-expand-left'
  }
  mindmapSlideStyle.top = pr.top + 'px'
  mindmapSlideStyle.height = pr.height + 'px'
  nextTick(() => { mindmapSlideStyle.width = mmW + 'px' })

  // 有缓存直接显示
  if (cachedMindmapSvg) {
    mindmapSvgContent.value = cachedMindmapSvg
    return
  }

  // 首次加载
  mindmapLoading.value = true; mindmapSvgContent.value = ''
  try {
    cachedMindmapIsTech = hasTechTerms(cachedSummaryText)
    const mindmapMd = cachedMindmapText && cachedMindmapText.length > 10
      ? cachedMindmapText
      : await aiService.generateMindmap(cachedSummaryText, cachedPageMeta, cachedMindmapIsTech)
    cachedMindmapText = mindmapMd
    const treeData = parseMindmapMarkdown(mindmapMd)
    if (treeData && treeData.length > 0) {
      const finalTree = cachedMindmapIsTech ? treeData : limitTreeNodes(treeData, 10)
      cachedMindmapSvg = renderMindmapRadial(finalTree)
      mindmapSvgContent.value = cachedMindmapSvg
    }
  } catch (err) {
    if (cachedMindmapText) {
      const treeData = parseMindmapMarkdown(cachedMindmapText)
      if (treeData && treeData.length > 0) {
        cachedMindmapSvg = renderMindmapRadial(treeData)
        mindmapSvgContent.value = cachedMindmapSvg
      }
    }
    if (!mindmapSvgContent.value) notify('思维导图生成失败: ' + err.message, 'error')
  } finally { mindmapLoading.value = false }
}

function limitTreeNodes(tree, maxCount) {
  if (!tree || tree.length === 0) return tree
  const result = []; let count = 0
  function clone(node) {
    if (count >= maxCount) return null
    count++; const copy = { name: node.name, children: [] }
    if (node.children) for (const c of node.children) { const cc = clone(c); if (cc) copy.children.push(cc) }
    return copy
  }
  for (const node of tree) { const c = clone(node); if (c) result.push(c); if (count >= maxCount) break }
  return result
}

// ====== 放射状 SVG 渲染器 ======
let svgFilterCounter = 0
const RADIAL_COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#84cc16']

function renderMindmapRadial(treeData) {
  const filterId = 'mm-shadow-' + (svgFilterCounter++)
  const cx = 400, cy = 360, nodeW = 140, nodeH = 38
  const levelRadii = [0, 120, 240, 360] // 每层半径

  // BFS 分层
  const layers = []
  const parentMap = new Map() // child -> parent
  const queue = treeData.map(node => ({ node, depth: 0, parent: null }))
  while (queue.length) {
    const { node, depth, parent } = queue.shift()
    if (!layers[depth]) layers[depth] = []
    layers[depth].push(node)
    if (parent) parentMap.set(node, parent)
    if (node.children) node.children.forEach(c => queue.push({ node: c, depth: depth + 1, parent: node }))
  }

  // 计算节点坐标
  const nodePos = new Map() // node -> { x, y }
  for (let d = 0; d < layers.length; d++) {
    const nodes = layers[d]
    const r = levelRadii[Math.min(d, levelRadii.length - 1)]
    const count = nodes.length
    const startAngle = d === 1 ? -Math.PI / 2 : -Math.PI / 2 // 从顶部开始
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (2 * Math.PI * i) / Math.max(count, 1)
      const nx = cx + r * Math.cos(angle)
      const ny = cy + r * Math.sin(angle)
      if (d === 0) { nodePos.set(nodes[i], { x: cx - nodeW / 2, y: cy - nodeH / 2 }) }
      else { nodePos.set(nodes[i], { x: nx - nodeW / 2, y: ny - nodeH / 2 }) }
    }
  }

  const svgW = 800, svgH = 720
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="overflow:visible">`
  svg += `<defs><filter id="${filterId}"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.25"/></filter></defs>`

  // 背景圆环（装饰）
  for (let i = 1; i < levelRadii.length; i++) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${levelRadii[i]}" fill="none" stroke="rgba(129,140,248,0.08)" stroke-width="1" stroke-dasharray="4 4"/>`
  }

  // 连线
  for (const [child, parent] of parentMap) {
    const pp = nodePos.get(parent), cp = nodePos.get(child)
    if (!pp || !cp) continue
    const px = pp.x + nodeW / 2, py = pp.y + nodeH / 2
    const cx2 = cp.x + nodeW / 2, cy2 = cp.y + nodeH / 2
    const midX = (px + cx2) / 2, midY = (py + cy2) / 2
    svg += `<path d="M ${px} ${py} Q ${midX} ${midY} ${cx2} ${cy2}" stroke="rgba(129,140,248,0.25)" stroke-width="1.5" fill="none"/>`
  }

  // 节点
  function darken(hex, f) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return '#' + [r,g,b].map(v => Math.round(v*(1-f)).toString(16).padStart(2,'0')).join('')
  }

  for (let d = 0; d < layers.length; d++) {
    for (const node of layers[d]) {
      const pos = nodePos.get(node)
      if (!pos) continue
      const color = RADIAL_COLORS[Math.min(d, RADIAL_COLORS.length - 1)]
      const maxChars = Math.floor(nodeW / 12) - 1
      let tc
      if (node.name.length > maxChars) {
        tc = `<text x="${pos.x + nodeW/2}" y="${pos.y + nodeH/2 - 2}" text-anchor="middle" fill="#fff" font-size="12" font-family="Microsoft YaHei,PingFang SC,sans-serif" font-weight="${d===0?'700':'500'}">${node.name.substring(0,maxChars)}<tspan x="${pos.x + nodeW/2}" dy="14">${(node.name.substring(maxChars,maxChars*2)||'').substring(0,maxChars)}</tspan></text>`
      } else {
        tc = `<text x="${pos.x + nodeW/2}" y="${pos.y + nodeH/2 + 4}" text-anchor="middle" fill="#fff" font-size="12" font-family="Microsoft YaHei,PingFang SC,sans-serif" font-weight="${d===0?'700':'500'}">${node.name}</text>`
      }
      svg += `<g><rect x="${pos.x}" y="${pos.y}" width="${nodeW}" height="${nodeH}" rx="${d===0?22:10}" fill="${color}" stroke="${darken(color,0.15)}" stroke-width="1.5" filter="url(#${filterId})"/>${tc}</g>`
    }
  }

  svg += '</svg>'
  return svg
}

// ====== MD 下载 ======
function downloadMd() {
  chrome.runtime.sendMessage({ action: 'downloadMarkdown', content: cachedMdContent, filename: safeFilename(cachedPageMeta?.title) + '_总结.md' })
  downloadDone.value = true; setTimeout(() => { downloadDone.value = false }, 2000)
}

// ====== 通知 ======
const notification = reactive({ text: '', type: '' })
function notify(text, type = '') {
  notification.text = text; notification.type = type === 'error' ? 'ai-notification-error' : ''
  setTimeout(() => { notification.text = '' }, 4000)
}

// ====== 消息监听 ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggleWordSummary': wordSummaryEnabled.value = message.enabled; notify(message.enabled ? '划词总结已开启' : '划词总结已关闭'); sendResponse({ success: true }); break
    case 'pageSummary': doPageSummary(); sendResponse({ success: true }); break
    case 'getState': sendResponse({ wordSummaryEnabled: wordSummaryEnabled.value }); break
  }
  return true
})

// ====== 生命周期 ======
onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mousedown', onMouseDown)
  window.addEventListener('resize', updateArrowDirection)
  chrome.runtime.sendMessage({ action: 'getWordSummaryState' }, (res) => { if (res) wordSummaryEnabled.value = res.enabled })
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('resize', updateArrowDirection)
  document.removeEventListener('mousemove', onPanelDragMove)
  document.removeEventListener('mouseup', onPanelDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('mousemove', onTooltipDragMove)
  document.removeEventListener('mouseup', onTooltipDragEnd)
})
</script>

<style>
:root {
  --bg-primary: #0b1120; --bg-card: rgba(255,255,255,0.04);
  --border-subtle: rgba(255,255,255,0.06); --text-primary: #e2e8f0;
  --text-muted: #94a3b8; --accent-1: #818cf8; --accent-2: #c084fc;
  --gradient-primary: linear-gradient(135deg, #6366f1, #a855f7);
  --gradient-success: linear-gradient(135deg, #10b981, #34d399);
}

/* ====== Tooltip ====== */
.ai-tooltip-container {
  position: fixed; z-index: 2147483647; width: 300px;
  opacity: 0; font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
  animation: tipIn 0.25s ease forwards;
}
.ai-tooltip-container.visible { opacity: 1; }
@keyframes tipIn { from { opacity:0; transform:translateY(4px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
.ai-tooltip-frame {
  background: linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  backdrop-filter: blur(24px); border: 1px solid rgba(129,140,248,0.25);
  border-radius: 12px; padding: 12px 14px;
  box-shadow: 0 0 0 1px rgba(129,140,248,0.1), 0 12px 40px rgba(0,0,0,0.5);
}
.ai-tooltip-drag { cursor: grab; user-select: none; }
.ai-tooltip-drag:active { cursor: grabbing; }
.ai-tooltip-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.ai-tooltip-icon { color: #a78bfa; font-size: 10px; }
.ai-tooltip-title { font-size: 10px; font-weight: 600; color: #a78bfa; letter-spacing: 1px; text-transform: uppercase; flex: 1; }
.ai-tooltip-close-btn {
  background: none; border: none; color: #64748b; cursor: pointer;
  font-size: 11px; padding: 1px 5px; border-radius: 3px; transition: all 0.2s; line-height: 1;
}
.ai-tooltip-close-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
.ai-tooltip-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(129,140,248,0.3), transparent); margin-bottom: 6px; }
.ai-tooltip-body { position: relative; z-index: 1; }
.ai-tooltip-content { color: #cbd5e1; font-size: 13px; line-height: 1.6; word-break: break-word; }
.ai-tooltip-label { margin-top: 6px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.06); color: #64748b; font-size: 10px; }
.ai-tooltip-loading { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 12px; }
.ai-tooltip-spinner { width: 14px; height: 14px; border: 2px solid rgba(129,140,248,0.2); border-top-color: #818cf8; border-radius: 50%; animation: ai-spin 0.7s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }

/* ====== 结果面板 ====== */
.ai-result-panel {
  position: fixed; top: 5%; right: 5%; bottom: 5%; width: 520px; min-width: 320px; min-height: 300px;
  max-width: calc(100vw - 40px); max-height: calc(100vh - 40px);
  background: linear-gradient(170deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  backdrop-filter: blur(32px); border: 1px solid rgba(129,140,248,0.15); border-radius: 16px;
  box-shadow: 0 0 0 1px rgba(129,140,248,0.05), 0 24px 80px rgba(0,0,0,0.6);
  z-index: 2147483646; display: flex; flex-direction: column;
  opacity: 0; transform: translateX(30px);
  transition: opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1);
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
}
.ai-result-panel.visible { opacity: 1; transform: translateX(0); }
.ai-result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
  cursor: grab; user-select: none;
}
.ai-result-header:active { cursor: grabbing; }
.ai-result-header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #e2e8f0; pointer-events: none; }
.ai-result-close {
  background: none; border: none; font-size: 22px; color: #64748b; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; pointer-events: auto;
}
.ai-result-close:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.ai-result-body { flex: 1; overflow-y: auto; padding: 24px; }
.ai-result-body::-webkit-scrollbar { width: 4px; }
.ai-result-body::-webkit-scrollbar-track { background: transparent; }
.ai-result-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.ai-result-summary { font-size: 14px; line-height: 1.85; color: #cbd5e1; margin-bottom: 24px; }
.ai-result-summary h1,.ai-result-summary h2,.ai-result-summary h3 { color: #e2e8f0; margin-top: 20px; margin-bottom: 10px; font-weight: 700; }
.ai-result-summary h1 { font-size: 20px; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.ai-result-summary h2 { font-size: 17px; } .ai-result-summary h3 { font-size: 15px; }
.ai-result-summary p { margin: 10px 0; }
.ai-result-summary ul,.ai-result-summary ol { padding-left: 20px; }
.ai-result-summary code { background: rgba(99,102,241,0.15); color: #a78bfa; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.ai-result-summary pre { background: rgba(0,0,0,0.4); color: #cbd5e1; padding: 14px 18px; border-radius: 10px; overflow-x: auto; font-size: 13px; border: 1px solid rgba(255,255,255,0.05); }
.ai-result-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); }
.ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.ai-btn-download { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 0 20px rgba(16,185,129,0.2); }
.ai-btn-download:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(16,185,129,0.35); }
.ai-btn-download:disabled { opacity: 0.5; cursor: default; }
.ai-btn-cancel { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); }
.ai-btn-cancel:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
.ai-resize-handle {
  position: absolute; right: 0; bottom: 0; width: 18px; height: 18px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(129,140,248,0.3) 50%);
  border-radius: 0 0 16px 0;
}
.ai-resize-handle:hover { background: linear-gradient(135deg, transparent 50%, rgba(129,140,248,0.6) 50%); }

/* ====== 思维导图箭头 ====== */
.ai-mindmap-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 28px; height: 56px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9));
  color: #fff; font-size: 14px; cursor: pointer;
  z-index: 2147483647; transition: all 0.25s ease;
  box-shadow: 0 0 20px rgba(99,102,241,0.3); user-select: none;
}
.ai-mindmap-arrow:hover { box-shadow: 0 0 30px rgba(99,102,241,0.5); width: 32px; }
.ai-mindmap-arrow-left { left: -2px; border-radius: 6px 0 0 6px; }
.ai-mindmap-arrow-right { right: -2px; border-radius: 0 6px 6px 0; }
.ai-mindmap-arrow-close { background: linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85)); }

/* ====== 思维导图侧滑面板 ====== */
.ai-mindmap-slide {
  position: fixed; width: 0; overflow: hidden;
  background: linear-gradient(170deg, rgba(15,23,42,0.99), rgba(30,41,59,0.97));
  backdrop-filter: blur(32px); border: 1px solid rgba(129,140,248,0.15);
  box-shadow: 0 0 0 1px rgba(129,140,248,0.05), 0 24px 80px rgba(0,0,0,0.6);
  z-index: 2147483645; display: flex; flex-direction: column;
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
  transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
  animation: mmPopIn 0.35s cubic-bezier(0.16,1,0.3,1);
}
@keyframes mmPopIn { from { transform: scale(0.92); opacity: 0.6; } to { transform: scale(1); opacity: 1; } }
.ai-mindmap-expand-right { border-radius: 0 16px 16px 0; border-left: none; }
.ai-mindmap-expand-left { border-radius: 16px 0 0 16px; border-right: none; }
.ai-mindmap-slide-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; min-width: 320px;
}
.ai-mindmap-slide-header h2 { margin: 0; font-size: 17px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; white-space: nowrap; }
.ai-mindmap-slide-body {
  flex: 1; overflow: auto; padding: 20px; min-width: 320px;
  display: flex; align-items: center; justify-content: center;
}
.ai-mindmap-slide-body::-webkit-scrollbar { width: 4px; height: 4px; }
.ai-mindmap-slide-body::-webkit-scrollbar-track { background: transparent; }
.ai-mindmap-slide-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.ai-mindmap-loading { display: flex; align-items: center; gap: 12px; color: #64748b; font-size: 14px; }
.ai-mindmap-empty { color: #475569; font-size: 14px; text-align: center; }
.ai-mindmap-svg-wrap { width: 100%; height: 100%; min-height: 300px; }
.ai-mindmap-svg-wrap svg { max-width: 100%; max-height: 100%; }
.ai-mindmap-svg-wrap svg g:hover rect { filter: brightness(1.15) drop-shadow(0 0 12px rgba(99,102,241,0.3)); transition: all 0.2s ease; }
.ai-mindmap-svg-wrap svg g { cursor: pointer; }

/* ====== 进度遮罩 ====== */
.ai-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 2147483645; display: flex; align-items: center; justify-content: center; }
.ai-overlay-card { background: linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96)); border: 1px solid rgba(129,140,248,0.15); border-radius: 20px; padding: 48px 56px; text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,0.5); }
.ai-overlay-spinner { width: 40px; height: 40px; margin: 0 auto 24px; border: 2px solid rgba(129,140,248,0.15); border-top-color: #818cf8; border-radius: 50%; animation: ai-spin 0.7s linear infinite; }
.ai-overlay-text { font-size: 16px; font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
.ai-overlay-sub { font-size: 13px; color: #64748b; }

/* ====== 通知 ====== */
.ai-notification {
  position: fixed; top: 24px; right: 24px; z-index: 2147483647;
  padding: 12px 22px; border-radius: 10px; font-size: 13px; font-weight: 500;
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
  color: #fff; background: linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  border: 1px solid rgba(129,140,248,0.2); box-shadow: 0 0 30px rgba(99,102,241,0.15); backdrop-filter: blur(12px);
}
.ai-notification-error { border-color: rgba(239,68,68,0.3); box-shadow: 0 0 30px rgba(239,68,68,0.15); }
.notify-enter-active,.notify-leave-active { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
.notify-enter-from,.notify-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
