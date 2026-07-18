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
/* ====== Design Token ====== */
:root {
  --bg-primary: #0b1120;
  --bg-card: rgba(255,255,255,0.04);
  --border-subtle: rgba(255,255,255,0.06);
  --text-primary: #e2e8f0;
  --text-muted: #94a3b8;
  --accent-1: #818cf8;
  --accent-2: #c084fc;
  --gradient-primary: linear-gradient(135deg, #6366f1, #a855f7);
  --gradient-success: linear-gradient(135deg, #10b981, #34d399);
}

/* ====== Tooltip ====== */
.ai-tooltip-container {
  position: fixed; z-index: 2147483647; max-width: 320px;
  opacity: 0; transform: translateY(6px) scale(0.97);
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
  pointer-events: none;
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
}
.ai-tooltip-container.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.ai-tooltip-frame {
  background: linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  backdrop-filter: blur(24px);
  border: 1px solid rgba(129,140,248,0.25);
  border-radius: 12px; padding: 16px 18px;
  box-shadow: 0 0 0 1px rgba(129,140,248,0.1), 0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.08);
  overflow: hidden;
}
.ai-tooltip-frame::before {
  content: ''; position: absolute; inset: 0; border-radius: 12px; padding: 1px;
  background: linear-gradient(135deg, rgba(129,140,248,0.4), transparent 40%, transparent 60%, rgba(192,132,252,0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
.ai-tooltip-corner { display: none; }
.ai-tooltip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; position: relative; z-index: 1; }
.ai-tooltip-icon { color: #a78bfa; font-size: 12px; filter: drop-shadow(0 0 6px rgba(167,139,250,0.4)); }
.ai-tooltip-title { font-size: 11px; font-weight: 600; color: #a78bfa; letter-spacing: 1.5px; text-transform: uppercase; }
.ai-tooltip-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(129,140,248,0.3), transparent); margin: 0 0 10px 0; }
.ai-tooltip-body { position: relative; z-index: 1; }
.ai-tooltip-content { color: #cbd5e1; font-size: 13px; line-height: 1.65; word-break: break-word; }
.ai-tooltip-loading { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 12px; }
.ai-tooltip-spinner { width: 14px; height: 14px; border: 2px solid rgba(129,140,248,0.2); border-top-color: #818cf8; border-radius: 50%; animation: ai-spin 0.7s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }

/* ====== 结果面板 ====== */
.ai-result-panel {
  position: fixed; top: 5%; right: 5%; bottom: 5%; width: 520px; max-width: calc(100vw - 40px);
  background: linear-gradient(170deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  backdrop-filter: blur(32px);
  border: 1px solid rgba(129,140,248,0.15);
  border-radius: 16px;
  box-shadow: 0 0 0 1px rgba(129,140,248,0.05), 0 24px 80px rgba(0,0,0,0.6);
  z-index: 2147483646; display: flex; flex-direction: column;
  opacity: 0; transform: translateX(30px);
  transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif; overflow: hidden;
}
.ai-result-panel.visible { opacity: 1; transform: translateX(0); }
.ai-result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.ai-result-header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.5px; }
.ai-result-close {
  background: none; border: none; font-size: 22px; color: #64748b; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.ai-result-close:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.ai-result-body { flex: 1; overflow-y: auto; padding: 24px; }
.ai-result-body::-webkit-scrollbar { width: 4px; }
.ai-result-body::-webkit-scrollbar-track { background: transparent; }
.ai-result-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.ai-result-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
.ai-result-summary { font-size: 14px; line-height: 1.85; color: #cbd5e1; margin-bottom: 24px; }
.ai-result-summary h1,.ai-result-summary h2,.ai-result-summary h3 { color: #e2e8f0; margin-top: 20px; margin-bottom: 10px; font-weight: 700; }
.ai-result-summary h1 { font-size: 20px; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.ai-result-summary h2 { font-size: 17px; } .ai-result-summary h3 { font-size: 15px; }
.ai-result-summary p { margin: 10px 0; }
.ai-result-summary ul,.ai-result-summary ol { padding-left: 20px; }
.ai-result-summary code { background: rgba(99,102,241,0.15); color: #a78bfa; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.ai-result-summary pre { background: rgba(0,0,0,0.4); color: #cbd5e1; padding: 14px 18px; border-radius: 10px; overflow-x: auto; font-size: 13px; border: 1px solid rgba(255,255,255,0.05); }
.ai-result-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); }
.ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; letter-spacing: 0.3px; }
.ai-btn-mindmap { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 0 20px rgba(99,102,241,0.25); }
.ai-btn-mindmap:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(99,102,241,0.4); }
.ai-btn-download { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: 0 0 20px rgba(16,185,129,0.2); }
.ai-btn-download:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(16,185,129,0.35); }
.ai-btn-download:disabled { opacity: 0.5; cursor: default; }
.ai-btn-cancel { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); }
.ai-btn-cancel:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

/* ====== 进度遮罩 ====== */
.ai-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 2147483645; display: flex; align-items: center; justify-content: center; }
.ai-overlay-card {
  background: linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  border: 1px solid rgba(129,140,248,0.15);
  border-radius: 20px; padding: 48px 56px; text-align: center;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}
.ai-overlay-spinner {
  width: 40px; height: 40px; margin: 0 auto 24px;
  border: 2px solid rgba(129,140,248,0.15); border-top-color: #818cf8;
  border-radius: 50%; animation: ai-spin 0.7s linear infinite;
}
.ai-overlay-text { font-size: 16px; font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
.ai-overlay-sub { font-size: 13px; color: #64748b; }

/* ====== 通知 ====== */
.ai-notification {
  position: fixed; top: 24px; right: 24px; z-index: 2147483647;
  padding: 12px 22px; border-radius: 10px; font-size: 13px; font-weight: 500;
  font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif;
  color: #fff; letter-spacing: 0.3px;
  background: linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
  border: 1px solid rgba(129,140,248,0.2);
  box-shadow: 0 0 30px rgba(99,102,241,0.15);
  backdrop-filter: blur(12px);
}
.ai-notification-error {
  border-color: rgba(239,68,68,0.3);
  box-shadow: 0 0 30px rgba(239,68,68,0.15);
}
.notify-enter-active,.notify-leave-active { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
.notify-enter-from,.notify-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
