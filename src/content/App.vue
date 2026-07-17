<template>
  <div id="ai-content-app">
    <!-- 划词总结 Tooltip -->
    <div v-if="tooltipVisible" class="ai-tooltip-container visible" :style="tooltipStyle">
      <div class="ai-tooltip-frame">
        <div class="ai-tooltip-corner ai-tooltip-corner-tl"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-tr"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-bl"></div>
        <div class="ai-tooltip-corner ai-tooltip-corner-br"></div>
        <div class="ai-tooltip-header">
          <span class="ai-tooltip-icon">&#9670;</span>
          <span class="ai-tooltip-title">AI 划词总结</span>
        </div>
        <div class="ai-tooltip-divider"></div>
        <div class="ai-tooltip-body">
          <div v-if="tooltipLoading" class="ai-tooltip-loading">
            <span class="ai-tooltip-spinner"></span>
            正在分析...
          </div>
          <div v-else class="ai-tooltip-content">{{ tooltipContent }}</div>
        </div>
      </div>
    </div>

    <!-- 通知 -->
    <Transition name="notify">
      <div v-if="notification.text" class="ai-notification" :class="notification.type">
        {{ notification.text }}
      </div>
    </Transition>

    <!-- 进度遮罩 -->
    <div v-if="showOverlay" class="ai-overlay">
      <div class="ai-overlay-card">
        <div class="ai-overlay-spinner"></div>
        <div class="ai-overlay-text">AI 正在分析页面内容...</div>
        <div class="ai-overlay-sub">这可能需要几秒钟</div>
      </div>
    </div>

    <!-- 结果面板 -->
    <div v-if="showPanel" class="ai-result-panel visible">
      <div class="ai-result-header">
        <h2>页面总结</h2>
        <button class="ai-result-close" @click="closePanel">&times;</button>
      </div>
      <div class="ai-result-body">
        <div class="ai-result-summary" v-html="resultHtml"></div>
        <div class="ai-result-actions">
          <button class="ai-btn ai-btn-mindmap" @click="openMindmap">
            查看思维导图
          </button>
          <button class="ai-btn ai-btn-download" @click="downloadMd" :disabled="downloadDone">
            {{ downloadDone ? '已触发下载' : '下载 MD 文件' }}
          </button>
          <button class="ai-btn ai-btn-cancel" @click="closePanel">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { aiService } from '../lib/ai.js'
import { getPageMeta, extractPageContent, truncateText, generateMarkdown, safeFilename, parseSummaryResult } from '../lib/utils.js'
import { parseMarkdown } from '../lib/markdown.js'

// ====== 划词总结 ======
const wordSummaryEnabled = ref(false)
const tooltipVisible = ref(false)
const tooltipLoading = ref(false)
const tooltipContent = ref('')
const tooltipStyle = reactive({ left: '0px', top: '0px' })

function positionTooltip(x, y) {
  const w = 340, h = 180
  let px = x + 15, py = y - 10
  if (px + w > window.innerWidth - 10) px = x - w - 15
  if (py + h > window.innerHeight - 10) py = y - h - 10
  tooltipStyle.left = Math.max(5, px) + 'px'
  tooltipStyle.top = Math.max(5, py) + 'px'
}

async function onMouseUp(e) {
  if (!wordSummaryEnabled.value) return
  const selection = window.getSelection()
  const text = selection.toString().trim()
  if (!text || text.length > 300) { tooltipVisible.value = false; return }

  positionTooltip(e.clientX, e.clientY)
  tooltipVisible.value = true
  tooltipLoading.value = true
  tooltipContent.value = ''

  try {
    const result = await aiService.summarizeWord(text)
    tooltipContent.value = result.replace(/["""]/g, '').trim()
  } catch (err) {
    tooltipContent.value = '总结失败: ' + err.message
  } finally {
    tooltipLoading.value = false
  }
}

function onMouseDown(e) {
  if (tooltipVisible.value) {
    // 延迟检查是否点击在 tooltip 外部
    nextTick(() => {
      const el = document.querySelector('.ai-tooltip-container')
      if (el && !el.contains(e.target)) tooltipVisible.value = false
    })
  }
}

// ====== 页面总结 ======
const showOverlay = ref(false)
const showPanel = ref(false)
const resultHtml = ref('')
const downloadDone = ref(false)
let cachedMdContent = ''
let cachedMindmapText = ''
let cachedPageMeta = null
let cachedSummaryText = ''

async function doPageSummary() {
  showOverlay.value = true
  try {
    const pageMeta = getPageMeta()
    const pageContent = extractPageContent()
    const truncated = truncateText(pageContent, 15000)

    const result = await aiService.summarizePage(pageMeta, truncated)
    const { summaryText, mindmapText } = parseSummaryResult(result)

    cachedMdContent = generateMarkdown(pageMeta, summaryText, mindmapText)
    cachedMindmapText = mindmapText
    cachedPageMeta = pageMeta
    cachedSummaryText = summaryText

    resultHtml.value = parseMarkdown(summaryText)
    showOverlay.value = false
    showPanel.value = true
    downloadDone.value = false
  } catch (err) {
    showOverlay.value = false
    notify(err.message, 'error')
  }
}

function closePanel() { showPanel.value = false }
function openMindmap() {
  chrome.runtime.sendMessage({
    action: 'openMindmap',
    data: { mindmapText: cachedMindmapText, pageMeta: cachedPageMeta, summaryText: cachedSummaryText }
  })
}
function downloadMd() {
  chrome.runtime.sendMessage({
    action: 'downloadMarkdown',
    content: cachedMdContent,
    filename: safeFilename(cachedPageMeta?.title) + '_总结.md'
  })
  downloadDone.value = true
  setTimeout(() => { downloadDone.value = false }, 2000)
}

// ====== 通知 ======
const notification = reactive({ text: '', type: '' })
function notify(text, type = '') {
  notification.text = text
  notification.type = type === 'error' ? 'ai-notification-error' : ''
  setTimeout(() => { notification.text = '' }, 4000)
}

// ====== 消息监听 ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggleWordSummary':
      wordSummaryEnabled.value = message.enabled
      notify(message.enabled ? '划词总结已开启' : '划词总结已关闭')
      sendResponse({ success: true })
      break
    case 'pageSummary':
      doPageSummary()
      sendResponse({ success: true })
      break
    case 'getState':
      sendResponse({ wordSummaryEnabled: wordSummaryEnabled.value })
      break
  }
  return true
})

// ====== 生命周期 ======
onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mousedown', onMouseDown)
  chrome.runtime.sendMessage({ action: 'getWordSummaryState' }, (res) => {
    if (res) wordSummaryEnabled.value = res.enabled
  })
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousedown', onMouseDown)
})
</script>

<style>
/* ==================== P社风格划词总结 Tooltip ==================== */
.ai-tooltip-container {
  position: fixed; z-index: 2147483647; max-width: 340px;
  opacity: 0; transform: translateY(8px) scale(0.95);
  transition: opacity 0.25s cubic-bezier(0.22,0.61,0.36,1), transform 0.25s cubic-bezier(0.22,0.61,0.36,1);
  pointer-events: none;
  font-family: 'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;
}
.ai-tooltip-container.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.ai-tooltip-frame {
  position: relative;
  background: linear-gradient(170deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
  border: 2px solid #c9a96e; border-radius: 3px; padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(201,169,110,0.3);
  overflow: hidden;
}
.ai-tooltip-frame::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,169,110,0.02) 2px, rgba(201,169,110,0.02) 4px);
  pointer-events: none; border-radius: 3px;
}
.ai-tooltip-corner { position: absolute; width: 12px; height: 12px; border-color: #c9a96e; border-style: solid; border-width: 0; }
.ai-tooltip-corner-tl { top: 4px; left: 4px; border-top-width: 2px; border-left-width: 2px; }
.ai-tooltip-corner-tr { top: 4px; right: 4px; border-top-width: 2px; border-right-width: 2px; }
.ai-tooltip-corner-bl { bottom: 4px; left: 4px; border-bottom-width: 2px; border-left-width: 2px; }
.ai-tooltip-corner-br { bottom: 4px; right: 4px; border-bottom-width: 2px; border-right-width: 2px; }
.ai-tooltip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; position: relative; z-index: 1; }
.ai-tooltip-icon { color: #c9a96e; font-size: 12px; }
.ai-tooltip-title { font-size: 11px; font-weight: 600; color: #c9a96e; text-transform: uppercase; letter-spacing: 2px; }
.ai-tooltip-divider { height: 1px; background: linear-gradient(90deg, transparent, #c9a96e, transparent); margin: 8px 0; opacity: 0.5; position: relative; z-index: 1; }
.ai-tooltip-body { position: relative; z-index: 1; min-height: 40px; }
.ai-tooltip-content { color: #e0d5c1; font-size: 13px; line-height: 1.7; word-break: break-word; letter-spacing: 0.3px; }
.ai-tooltip-loading { display: flex; align-items: center; gap: 8px; color: #8a8a9a; font-size: 12px; }
.ai-tooltip-spinner { width: 14px; height: 14px; border: 2px solid #c9a96e; border-top-color: transparent; border-radius: 50%; animation: ai-spin 0.8s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }

/* ==================== 结果面板 ==================== */
.ai-result-panel {
  position: fixed; top: 5%; right: 5%; bottom: 5%; width: 500px; max-width: calc(100vw - 40px);
  background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1);
  z-index: 2147483646; display: flex; flex-direction: column;
  opacity: 0; transform: translateX(30px);
  transition: opacity 0.35s cubic-bezier(0.22,0.61,0.36,1), transform 0.35s cubic-bezier(0.22,0.61,0.36,1);
  font-family: 'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif; overflow: hidden;
}
.ai-result-panel.visible { opacity: 1; transform: translateX(0); }
.ai-result-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.ai-result-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; }
.ai-result-close { background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.2s; line-height: 1; }
.ai-result-close:hover { background: #f3f4f6; color: #374151; }
.ai-result-body { flex: 1; overflow-y: auto; padding: 24px; }
.ai-result-body::-webkit-scrollbar { width: 6px; }
.ai-result-body::-webkit-scrollbar-track { background: transparent; }
.ai-result-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.ai-result-body::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
.ai-result-summary { font-size: 14px; line-height: 1.8; color: #374151; margin-bottom: 24px; }
.ai-result-summary h1,.ai-result-summary h2,.ai-result-summary h3 { color: #1f2937; margin-top: 16px; margin-bottom: 8px; }
.ai-result-summary h1 { font-size: 20px; } .ai-result-summary h2 { font-size: 17px; } .ai-result-summary h3 { font-size: 15px; }
.ai-result-summary p { margin: 8px 0; }
.ai-result-summary ul,.ai-result-summary ol { padding-left: 20px; }
.ai-result-summary code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.ai-result-summary pre { background: #1f2937; color: #e5e7eb; padding: 12px 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
.ai-result-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid #e5e7eb; }
.ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.ai-btn-mindmap { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
.ai-btn-mindmap:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
.ai-btn-download { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
.ai-btn-download:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
.ai-btn-download:disabled { opacity: 0.6; cursor: default; }
.ai-btn-cancel { background: #f3f4f6; color: #6b7280; }
.ai-btn-cancel:hover { background: #e5e7eb; color: #374151; }

/* ==================== 进度遮罩 ==================== */
.ai-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2147483645; display: flex; align-items: center; justify-content: center; }
.ai-overlay-card { background: #fff; border-radius: 16px; padding: 40px 50px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.ai-overlay-spinner { width: 44px; height: 44px; margin: 0 auto 20px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: ai-spin 0.8s linear infinite; }
.ai-overlay-text { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px; }
.ai-overlay-sub { font-size: 13px; color: #9ca3af; }

/* ==================== 通知 ==================== */
.ai-notification { position: fixed; top: 20px; right: 20px; z-index: 2147483647; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; font-family: 'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif; color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
.ai-notification-error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 8px 24px rgba(239,68,68,0.3); }
.notify-enter-active,.notify-leave-active { transition: all 0.3s ease; }
.notify-enter-from,.notify-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
