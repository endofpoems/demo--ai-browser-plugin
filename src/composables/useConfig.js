/**
 * 配置管理 Composable
 */
import { ref, onMounted } from 'vue'
import { getConfig, saveConfig } from '../lib/storage.js'

export function useConfig() {
  const apiKey = ref('')
  const baseUrl = ref('https://api.openai.com')
  const modelName = ref('gpt-3.5-turbo')
  const isConfigured = ref(false)
  const loading = ref(true)

  async function load() {
    try {
      const config = await getConfig()
      apiKey.value = config.apiKey
      baseUrl.value = config.baseUrl
      modelName.value = config.modelName
      isConfigured.value = !!config.apiKey
    } catch (err) {
      console.error('[AI插件] 加载配置失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function save() {
    await saveConfig({
      apiKey: apiKey.value.trim(),
      baseUrl: baseUrl.value.trim(),
      modelName: modelName.value.trim()
    })
    isConfigured.value = !!apiKey.value.trim()
  }

  return { apiKey, baseUrl, modelName, isConfigured, loading, load, save }
}
