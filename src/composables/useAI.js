/**
 * AI 服务 Composable
 */
import { ref } from 'vue'
import { aiService } from '../lib/ai.js'

export function useAI() {
  const loading = ref(false)
  const result = ref('')
  const error = ref('')

  /** 页面总结 */
  async function summarizePage(pageMeta, pageContent) {
    loading.value = true
    error.value = ''
    result.value = ''
    try {
      result.value = await aiService.summarizePage(pageMeta, pageContent)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /** 划词总结 */
  async function summarizeWord(text) {
    return aiService.summarizeWord(text)
  }

  /** 测试连接 */
  async function testConnection() {
    loading.value = true
    error.value = ''
    try {
      await aiService.testConnection()
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, result, error, summarizePage, summarizeWord, testConnection }
}
