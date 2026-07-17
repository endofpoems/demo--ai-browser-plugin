<template>
  <div class="popup-container">
    <header class="popup-header">
      <div class="popup-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="url(#grad)"/>
          <path d="M8 14L12 18L20 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stop-color="#6366f1"/>
              <stop offset="100%" stop-color="#8b5cf6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1>AI 学习助手</h1>
    </header>

    <div class="popup-body">
      <div class="popup-status" :style="{ background: statusBg }">
        <span class="status-dot" :style="{ background: statusColor }"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <div class="popup-actions">
        <button class="popup-btn primary" @click="handleSummary">
          <span class="btn-icon">&#x1F4CB;</span>
          <div class="btn-info">
            <span class="btn-title">页面总结</span>
            <span class="btn-shortcut">快捷键 Alt+S</span>
          </div>
        </button>
        <button class="popup-btn" @click="handleWordSummary">
          <span class="btn-icon">&#x270F;&#xFE0F;</span>
          <div class="btn-info">
            <span class="btn-title">划词总结</span>
            <span class="btn-status" :style="{ color: wordEnabledColor }">{{ wordStatusText }}</span>
          </div>
        </button>
      </div>
    </div>

    <footer class="popup-footer">
      <button class="popup-link" @click="openSettings">&#x2699; 设置</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getConfig } from '../lib/storage.js'

const isConfigured = ref(false)
const wordEnabled = ref(false)

const statusText = computed(() => isConfigured.value ? '已配置 API' : '请先配置 API Key')
const statusBg = computed(() => isConfigured.value ? '#f0fdf4' : '#fffbeb')
const statusColor = computed(() => isConfigured.value ? '#22c55e' : '#f59e0b')
const wordStatusText = computed(() => wordEnabled.value ? '已开启 点击关闭' : '点击开启')
const wordEnabledColor = computed(() => wordEnabled.value ? '#22c55e' : '#6366f1')

async function checkApi() {
  if (!isConfigured.value) { chrome.runtime.openOptionsPage(); return false }
  return true
}

async function handleSummary() {
  if (!(await checkApi())) return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.tabs.sendMessage(tab.id, { action: 'pageSummary' })
  window.close()
}

async function handleWordSummary() {
  if (!(await checkApi())) return
  chrome.runtime.sendMessage({ action: 'toggleWordSummaryFromPopup' }, (res) => {
    wordEnabled.value = res?.enabled || false
    window.close()
  })
}

function openSettings() { chrome.runtime.openOptionsPage() }

onMounted(async () => {
  const config = await getConfig()
  isConfigured.value = !!config.apiKey
  chrome.runtime.sendMessage({ action: 'getWordSummaryState' }, (res) => {
    wordEnabled.value = res?.enabled || false
  })
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 320px; font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif; background: #fff; color: #1f2937; }
.popup-container { display: flex; flex-direction: column; }
.popup-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.popup-header h1 { font-size: 16px; font-weight: 700; }
.popup-body { padding: 16px 20px; }
.popup-status { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #166534; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.popup-actions { display: flex; flex-direction: column; gap: 10px; }
.popup-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; cursor: pointer; transition: all 0.2s ease; text-align: left; font-family: inherit; }
.popup-btn:hover { background: #f9fafb; border-color: #d1d5db; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.popup-btn.primary { background: linear-gradient(135deg, #eef2ff, #e0e7ff); border-color: #c7d2fe; }
.popup-btn.primary:hover { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); }
.popup-btn .btn-icon { font-size: 22px; flex-shrink: 0; }
.popup-btn .btn-info { display: flex; flex-direction: column; gap: 2px; }
.popup-btn .btn-title { font-size: 14px; font-weight: 600; color: #1f2937; }
.popup-btn .btn-shortcut { font-size: 11px; color: #9ca3af; }
.popup-btn .btn-status { font-size: 11px; }
.popup-footer { padding: 12px 20px; border-top: 1px solid #f3f4f6; }
.popup-link { background: none; border: none; color: #6b7280; font-size: 12px; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: all 0.2s; font-family: inherit; }
.popup-link:hover { background: #f3f4f6; color: #374151; }
</style>
