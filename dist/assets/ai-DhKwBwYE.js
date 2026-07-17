import{m as h}from"./storage-SKRwIOKn.js";class u{async chat(e,n={}){var s,c,i,m;const o=await h();if(!o.apiKey)throw new Error("请先在设置中配置 API Key");const l=`${o.baseUrl.replace(/\/+$/,"")}/v1/chat/completions`,w={model:o.modelName,messages:e,temperature:n.temperature??.7,max_tokens:n.maxTokens??8192,stream:!1};let t;try{t=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o.apiKey}`},body:JSON.stringify(w)})}catch(r){throw new Error(`网络请求失败: ${r.message}`)}if(!t.ok){let r=`API 错误: ${t.status}`;try{r=((s=(await t.json()).error)==null?void 0:s.message)||r}catch{}throw new Error(r)}let a;try{a=await t.json()}catch(r){throw new Error(`响应解析失败: ${r.message}`)}if(!((m=(i=(c=a.choices)==null?void 0:c[0])==null?void 0:i.message)!=null&&m.content))throw new Error("AI 返回数据格式异常");return a.choices[0].message.content}async testConnection(){if(!(await h()).apiKey)throw new Error("请先填写 API Key");return this.chat([{role:"user",content:"回复OK"}],{temperature:0,maxTokens:100})}async summarizeWord(e){return this.chat([{role:"system",content:"你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。"},{role:"user",content:`请解释："${e}"`}],{temperature:.5,maxTokens:2e3})}async summarizePage(e,n){return this.chat([{role:"system",content:`你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`},{role:"user",content:`网页标题：${e.title}
网页URL：${e.url}
网页描述：${e.description}

网页主要内容：
${n}`}],{temperature:.7,maxTokens:8192})}}const g=new u;export{g as a};
