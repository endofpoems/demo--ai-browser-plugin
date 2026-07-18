/**
 * AI API 调用模块 - 兼容 OpenAI 协议
 */
import { getConfig } from './storage.js'

class AIService {
  async chat(messages, options = {}) {
    const config = await getConfig()

    if (!config.apiKey) {
      throw new Error('请先在设置中配置 API Key')
    }

    const baseUrl = config.baseUrl.replace(/\/+$/, '')
    const endpoint = `${baseUrl}/v1/chat/completions`

    const body = {
      model: config.modelName,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 8192,
      stream: false
    }

    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
      })
    } catch (err) {
      throw new Error(`网络请求失败: ${err.message}`)
    }

    if (!response.ok) {
      let errMsg = `API 错误: ${response.status}`
      try {
        const errData = await response.json()
        errMsg = errData.error?.message || errMsg
      } catch (_) { /* ignore parse error */ }
      throw new Error(errMsg)
    }

    let data
    try {
      data = await response.json()
    } catch (err) {
      throw new Error(`响应解析失败: ${err.message}`)
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('AI 返回数据格式异常')
    }

    return data.choices[0].message.content
  }

  /** 测试 API 连接 */
  async testConnection() {
    const config = await getConfig()
    if (!config.apiKey) throw new Error('请先填写 API Key')

    return this.chat(
      [{ role: 'user', content: '回复OK' }],
      { temperature: 0, maxTokens: 100 }
    )
  }

  /** 划词总结 */
  async summarizeWord(text) {
    return this.chat(
      [
        {
          role: 'system',
          content: '你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。'
        },
        { role: 'user', content: `请解释："${text}"` }
      ],
      { temperature: 0.5, maxTokens: 2000 }
    )
  }

  /** 页面总结 */
  async summarizePage(pageMeta, pageContent) {
    return this.chat(
      [
        {
          role: 'system',
          content: `你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`
        },
        {
          role: 'user',
          content: `网页标题：${pageMeta.title}\n网页URL：${pageMeta.url}\n网页描述：${pageMeta.description}\n\n网页主要内容：\n${pageContent}`
        }
      ],
      { temperature: 0.7, maxTokens: 8192 }
    )
  }

  /** 基于页面总结生成思维导图（结合AI知识搜索，不从网页原文获取） */
  async generateMindmap(summaryText, pageMeta, isTech = true) {
    const systemPrompt = isTech
      ? `你是一个专业知识图谱构建助手。请基于提供的页面总结内容，结合你对该主题的深度知识进行搜索和补充，生成一份简洁的思维导图。

要求：
1. 必须围绕"是什么"、"为什么"、"使用场景"、"优点"、"缺点"五个维度组织
2. 以 Markdown 标题格式（# 主标题, ## 二级节点, ### 三级细节）组织
3. 每个节点名称精炼（10字以内），层级不超过3层
4. 思维导图必须以 "# 思维导图" 作为开头

请用中文回复。`
      : `你是一个信息可视化助手。请基于提供的页面总结内容，生成一份简洁的图解示意结构。

要求：
1. 提取总结中的核心要点，用树形结构组织（不超过10个节点）
2. 以 Markdown 标题格式（# 主标题, ## 子节点）组织，最多2层
3. 每个节点名称精炼（8字以内）
4. 思维导图必须以 "# 思维导图" 作为开头

请用中文回复。`

    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `页面标题：${pageMeta?.title || '未知'}\n\n页面总结内容：\n${summaryText}\n\n请基于以上总结，生成思维导图。`
        }
      ],
      { temperature: 0.6, maxTokens: isTech ? 4096 : 2048 }
    )
  }
}

// 全局单例
export const aiService = new AIService()
