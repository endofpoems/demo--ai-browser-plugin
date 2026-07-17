/**
 * Chrome Storage 封装 - 统一管理存储读写
 */

const DEFAULTS = {
  apiKey: '',
  baseUrl: 'https://api.openai.com',
  modelName: 'gpt-3.5-turbo'
}

/** 获取用户配置（sync storage） */
export function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'baseUrl', 'modelName'], (items) => {
      resolve({
        apiKey: items.apiKey || DEFAULTS.apiKey,
        baseUrl: items.baseUrl || DEFAULTS.baseUrl,
        modelName: items.modelName || DEFAULTS.modelName
      })
    })
  })
}

/** 保存用户配置 */
export function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || DEFAULTS.baseUrl,
      modelName: config.modelName || DEFAULTS.modelName
    }, resolve)
  })
}

/** 读取本地临时数据 */
export function getLocalData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key] || null))
  })
}

/** 写入本地临时数据 */
export function setLocalData(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}
