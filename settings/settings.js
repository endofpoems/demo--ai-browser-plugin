/**
 * 设置页面交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const baseUrlInput = document.getElementById('baseUrl');
  const modelNameInput = document.getElementById('modelName');
  const btnSave = document.getElementById('btnSave');
  const btnTest = document.getElementById('btnTest');
  const toggleKey = document.getElementById('toggleKey');
  const statusMessage = document.getElementById('statusMessage');

  // 加载已有配置
  loadConfig();

  // 保存设置
  btnSave.addEventListener('click', () => {
    const config = {
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim() || 'https://api.openai.com',
      modelName: modelNameInput.value.trim() || 'gpt-3.5-turbo'
    };

    chrome.storage.sync.set(config, () => {
      showStatus('设置已保存', 'success');
    });
  });

  // 测试连接
  btnTest.addEventListener('click', async () => {
    const config = {
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim() || 'https://api.openai.com',
      modelName: modelNameInput.value.trim() || 'gpt-3.5-turbo'
    };

    if (!config.apiKey) {
      showStatus('请先填写 API Key', 'error');
      return;
    }

    showStatus('正在测试连接...', 'loading');

    try {
      const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [
            { role: 'user', content: '回复OK' }
          ],
          max_tokens: 100,
          temperature: 0
        })
      });

      if (response.ok) {
        showStatus('连接测试成功！API 可用', 'success');
      } else {
        const errData = await response.json().catch(() => ({}));
        showStatus(`连接失败: ${errData.error?.message || response.status}`, 'error');
      }
    } catch (err) {
      showStatus(`连接失败: ${err.message}`, 'error');
    }
  });

  // 切换密码可见性
  toggleKey.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
  });

  function loadConfig() {
    chrome.storage.sync.get(['apiKey', 'baseUrl', 'modelName'], (items) => {
      if (items.apiKey) apiKeyInput.value = items.apiKey;
      if (items.baseUrl) baseUrlInput.value = items.baseUrl;
      if (items.modelName) modelNameInput.value = items.modelName;
    });
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `settings-status show ${type}`;
    if (type !== 'loading') {
      setTimeout(() => {
        statusMessage.classList.remove('show');
      }, 4000);
    }
  }
});
