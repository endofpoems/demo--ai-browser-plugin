import{p as l}from"./storage-ud7VzXPD.js";class d{async chat(e,t={}){var c,i,m,h;const r=await l();if(!r.apiKey)throw new Error("请先在设置中配置 API Key");const w=`${r.baseUrl.replace(/\/+$/,"")}/v1/chat/completions`,y={model:r.modelName,messages:e,temperature:t.temperature??.7,max_tokens:t.maxTokens??8192,stream:!1};let a;try{a=await fetch(w,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r.apiKey}`},body:JSON.stringify(y)})}catch(n){throw new Error(`网络请求失败: ${n.message}`)}if(!a.ok){let n=`API 错误: ${a.status}`;try{n=((c=(await a.json()).error)==null?void 0:c.message)||n}catch{}throw new Error(n)}let o;try{o=await a.json()}catch(n){throw new Error(`响应解析失败: ${n.message}`)}if(!((h=(m=(i=o.choices)==null?void 0:i[0])==null?void 0:m.message)!=null&&h.content))throw new Error("AI 返回数据格式异常");return o.choices[0].message.content}async testConnection(){if(!(await l()).apiKey)throw new Error("请先填写 API Key");return this.chat([{role:"user",content:"回复OK"}],{temperature:0,maxTokens:100})}async summarizeWord(e){return this.chat([{role:"system",content:"你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。"},{role:"user",content:`请解释："${e}"`}],{temperature:.5,maxTokens:2e3})}async summarizePage(e,t){return this.chat([{role:"system",content:`你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`},{role:"user",content:`网页标题：${e.title}
网页URL：${e.url}
网页描述：${e.description}

网页主要内容：
${t}`}],{temperature:.7,maxTokens:8192})}async generateMindmap(e,t,r=!0){const s=r?`你是一个专业知识图谱构建助手。请基于页面总结内容，结合你对该主题的深度知识，生成一份结构化思维导图。

【输出格式要求】严格按以下格式逐行输出，每行一个节点（用 | 分隔层级和类型）：

# 思维导图
## 🔍 是什么 (what)
### 定义说明
### 核心特征
## 💡 为什么 (why)
### 产生背景
### 解决的问题
## 🎯 使用场景 (scenario)
### 场景A
### 场景B
## ✅ 优点 (advantage)
### 优点一
### 优点二
## ❌ 缺点 (disadvantage)
### 缺点一
### 缺点二

【规则】
1. ## 开头的为五大维度（对应类型 what/why/scenario/advantage/disadvantage），可酌情增减
2. ### 开头的为具体条目，每个维度 2-4 条
3. 每个条目名称精炼（8字以内），文字简洁直白
4. 如某些维度不适用可省略，但至少有 3 个维度
5. 层级不超过 3 层

请用中文回复。`:`你是一个信息可视化助手。请基于页面总结内容，生成一份简洁图解结构。

【输出格式要求】严格按以下格式逐行输出：

# 思维导图
## 📋 核心要点 (point)
### 要点一
### 要点二
## 🔗 关键关联 (relation)
### 关联一
### 关联二

【规则】
1. 提取核心要点，用树形结构组织
2. 整体节点不超过 8 个
3. 每个节点名称精炼（6字以内）
4. 最多 2 层

请用中文回复。`;return this.chat([{role:"system",content:s},{role:"user",content:`页面标题：${(t==null?void 0:t.title)||"未知"}

页面总结内容：
${e}

请基于以上总结生成思维导图。`}],{temperature:.6,maxTokens:r?4096:2048})}}const f=new d;export{f as a};
