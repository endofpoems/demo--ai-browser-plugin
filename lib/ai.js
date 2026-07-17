/**
 * AI API 调用模块 - 兼容 OpenAI 协议
 */

class AIService {
  constructor() {
    this.config = null;
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiKey', 'baseUrl', 'modelName'], (items) => {
        this.config = {
          apiKey: items.apiKey || '',
          baseUrl: items.baseUrl || 'https://api.openai.com',
          modelName: items.modelName || 'gpt-3.5-turbo'
        };
        resolve(this.config);
      });
    });
  }

  async chat(messages, options = {}) {
    await this.loadConfig();

    if (!this.config.apiKey) {
      throw new Error('请先在设置中配置 API Key');
    }

    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const endpoint = `${baseUrl}/v1/chat/completions`;

    const body = {
      model: this.config.modelName,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 8192,
      stream: false
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// 全局单例
const aiService = new AIService();
