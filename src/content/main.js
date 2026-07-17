import { createApp } from 'vue'
import App from './App.vue'

// 创建挂载容器
const container = document.createElement('div')
container.id = 'ai-plugin-root'
document.body.appendChild(container)
createApp(App).mount('#ai-plugin-root')
