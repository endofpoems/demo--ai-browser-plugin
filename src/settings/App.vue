<template>
  <div class="settings-container">
    <header class="settings-header">
      <h1>&#x2699; 设置</h1>
      <p>配置 OpenAI 兼容的 API 参数</p>
    </header>

    <div class="settings-body">
      <div class="settings-card">
        <div class="form-group">
          <label for="apiKey">API Key</label>
          <div class="input-wrapper">
            <input :type="showKey ? 'text' : 'password'" id="apiKey" v-model="apiKey" placeholder="sk-..." autocomplete="off" />
            <button class="toggle-password" @click="showKey = !showKey" title="显示/隐藏">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="baseUrl">Base URL</label>
          <input type="text" id="baseUrl" v-model="baseUrl" placeholder="https://api.openai.com" />
          <span class="form-hint">兼容 OpenAI 协议的 API 地址</span>
        </div>

        <div class="form-group">
          <label for="modelName">模型名称</label>
          <input type="text" id="modelName" v-model="modelName" placeholder="gpt-3.5-turbo" />
          <span class="form-hint">例如: gpt-4, deepseek-chat, qwen-plus</span>
        </div>
      </div>

      <div class="settings-card">
        <h3>快捷键说明</h3>
        <div class="shortcuts-list">
          <div class="shortcut-item"><kbd>Alt+S</kbd><span>触发页面总结</span></div>
          <div class="shortcut-item"><kbd>Alt+W</kbd><span>开启/关闭划词总结</span></div>
        </div>
      </div>

      <div class="settings-actions">
        <button class="btn-save" @click="handleSave">保存设置</button>
        <button class="btn-test" @click="handleTest" :disabled="testing">{{ testing ? '测试中...' : '测试连接' }}</button>
      </div>

      <div v-if="statusText" class="settings-status show" :class="statusType">{{ statusText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getConfig, saveConfig } from '../lib/storage.js'
import { aiService } from '../lib/ai.js'

const apiKey = ref('')
const baseUrl = ref('https://api.openai.com')
const modelName = ref('gpt-3.5-turbo')
const showKey = ref(false)
const testing = ref(false)
const statusText = ref('')
const statusType = ref('success')

async function handleSave() {
  try {
    await saveConfig({ apiKey: apiKey.value, baseUrl: baseUrl.value, modelName: modelName.value })
    showStatus('设置已保存', 'success')
  } catch (err) {
    showStatus('保存失败: ' + err.message, 'error')
  }
}

async function handleTest() {
  if (!apiKey.value.trim()) { showStatus('请先填写 API Key', 'error'); return }
  testing.value = true
  showStatus('正在测试连接...', 'loading')
  try {
    // 先保存当前配置再测试
    await saveConfig({ apiKey: apiKey.value, baseUrl: baseUrl.value, modelName: modelName.value })
    await aiService.testConnection()
    showStatus('连接测试成功！API 可用', 'success')
  } catch (err) {
    showStatus('连接失败: ' + err.message, 'error')
  } finally {
    testing.value = false
  }
}

function showStatus(msg, type) {
  statusText.value = msg
  statusType.value = type
  if (type !== 'loading') setTimeout(() => { statusText.value = '' }, 4000)
}

onMounted(async () => {
  const config = await getConfig()
  apiKey.value = config.apiKey
  baseUrl.value = config.baseUrl
  modelName.value = config.modelName
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif; background: #f8fafc; color: #1f2937; min-height: 100vh; }
.settings-container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
.settings-header { text-align: center; margin-bottom: 32px; }
.settings-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.settings-header p { color: #6b7280; font-size: 14px; }
.settings-card { background: #fff; border-radius: 14px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.settings-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #374151; }
.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: inherit; color: #1f2937; background: #f9fafb; transition: all 0.2s; outline: none; }
.form-group input:focus { border-color: #818cf8; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.input-wrapper { position: relative; }
.input-wrapper input { padding-right: 42px; }
.toggle-password { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
.toggle-password:hover { color: #6b7280; background: #f3f4f6; }
.form-hint { display: block; font-size: 11px; color: #9ca3af; margin-top: 4px; }
.shortcuts-list { display: flex; flex-direction: column; gap: 10px; }
.shortcut-item { display: flex; align-items: center; gap: 12px; }
.shortcut-item kbd { display: inline-block; padding: 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-family: 'SF Mono','Consolas','Monaco',monospace; color: #475569; min-width: 60px; text-align: center; }
.shortcut-item span { font-size: 13px; color: #6b7280; }
.settings-actions { display: flex; gap: 10px; margin-bottom: 16px; }
.btn-save, .btn-test { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-save { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
.btn-save:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
.btn-test { background: #fff; color: #6366f1; border: 1.5px solid #c7d2fe; }
.btn-test:hover { background: #eef2ff; }
.btn-test:disabled { opacity: 0.6; cursor: default; }
.settings-status { text-align: center; font-size: 13px; padding: 10px; border-radius: 8px; display: none; }
.settings-status.show { display: block; }
.settings-status.success { background: #f0fdf4; color: #166534; }
.settings-status.error { background: #fef2f2; color: #991b1b; }
.settings-status.loading { background: #eff6ff; color: #1e40af; }
</style>
