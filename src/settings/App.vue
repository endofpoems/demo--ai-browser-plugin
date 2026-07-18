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
body { font-family: 'Inter','Microsoft YaHei','PingFang SC',sans-serif; background: linear-gradient(180deg, #0b1120, #111827); color: #e2e8f0; min-height: 100vh; }
.settings-container { max-width: 520px; margin: 0 auto; padding: 40px 24px; }
.settings-header { text-align: center; margin-bottom: 36px; }
.settings-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.settings-header p { color: #64748b; font-size: 14px; }
.settings-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 24px; margin-bottom: 14px; }
.settings-card h3 { font-size: 14px; font-weight: 700; margin-bottom: 14px; color: #cbd5e1; }
.form-group { margin-bottom: 18px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
.form-group input {
  width: 100%; padding: 10px 14px; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; font-size: 14px; font-family: inherit;
  color: #e2e8f0; background: rgba(0,0,0,0.3);
  transition: all 0.2s; outline: none;
}
.form-group input:focus { border-color: rgba(129,140,248,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.form-group input::placeholder { color: #475569; }
.input-wrapper { position: relative; }
.input-wrapper input { padding-right: 42px; }
.toggle-password { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
.toggle-password:hover { color: #a78bfa; background: rgba(99,102,241,0.1); }
.form-hint { display: block; font-size: 11px; color: #475569; margin-top: 4px; }
.shortcuts-list { display: flex; flex-direction: column; gap: 10px; }
.shortcut-item { display: flex; align-items: center; gap: 12px; }
.shortcut-item kbd { display: inline-block; padding: 4px 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.2); border-radius: 6px; font-size: 12px; font-family: 'SF Mono','Consolas',monospace; color: #a78bfa; min-width: 60px; text-align: center; }
.shortcut-item span { font-size: 13px; color: #94a3b8; }
.settings-actions { display: flex; gap: 10px; margin-bottom: 14px; }
.btn-save, .btn-test { flex: 1; padding: 12px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; letter-spacing: 0.3px; }
.btn-save { background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; box-shadow: 0 0 20px rgba(99,102,241,0.2); }
.btn-save:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(99,102,241,0.35); }
.btn-test { background: rgba(255,255,255,0.04); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.08); }
.btn-test:hover { background: rgba(255,255,255,0.08); border-color: rgba(129,140,248,0.3); }
.btn-test:disabled { opacity: 0.5; cursor: default; }
.settings-status { text-align: center; font-size: 13px; padding: 12px; border-radius: 10px; display: none; }
.settings-status.show { display: block; }
.settings-status.success { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
.settings-status.error { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.settings-status.loading { background: rgba(99,102,241,0.1); color: #a78bfa; border: 1px solid rgba(99,102,241,0.2); }
</style>
