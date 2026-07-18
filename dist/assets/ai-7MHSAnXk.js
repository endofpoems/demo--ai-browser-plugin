import{p as l}from"./storage-ud7VzXPD.js";class p{async chat(e,t={}){var c,i,m,h;const r=await l();if(!r.apiKey)throw new Error("请先在设置中配置 API Key");const u=`${r.baseUrl.replace(/\/+$/,"")}/v1/chat/completions`,w={model:r.modelName,messages:e,temperature:t.temperature??.7,max_tokens:t.maxTokens??8192,stream:!1};let o;try{o=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r.apiKey}`},body:JSON.stringify(w)})}catch(n){throw new Error(`网络请求失败: ${n.message}`)}if(!o.ok){let n=`API 错误: ${o.status}`;try{n=((c=(await o.json()).error)==null?void 0:c.message)||n}catch{}throw new Error(n)}let s;try{s=await o.json()}catch(n){throw new Error(`响应解析失败: ${n.message}`)}if(!((h=(m=(i=s.choices)==null?void 0:i[0])==null?void 0:m.message)!=null&&h.content))throw new Error("AI 返回数据格式异常");return s.choices[0].message.content}async testConnection(){if(!(await l()).apiKey)throw new Error("请先填写 API Key");return this.chat([{role:"user",content:"回复OK"}],{temperature:0,maxTokens:100})}async summarizeWord(e){return this.chat([{role:"system",content:"你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。"},{role:"user",content:`请解释："${e}"`}],{temperature:.5,maxTokens:2e3})}async summarizePage(e,t){return this.chat([{role:"system",content:`你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`},{role:"user",content:`网页标题：${e.title}
网页URL：${e.url}
网页描述：${e.description}

网页主要内容：
${t}`}],{temperature:.7,maxTokens:8192})}async generateMindmap(e,t,r=!0){const a=r?`你是一个专业知识图谱构建助手。请基于提供的页面总结内容，结合你对该主题的深度知识进行搜索和补充，生成一份简洁的思维导图。

要求：
1. 必须围绕"是什么"、"为什么"、"使用场景"、"优点"、"缺点"五个维度组织
2. 以 Markdown 标题格式（# 主标题, ## 二级节点, ### 三级细节）组织
3. 每个节点名称精炼（10字以内），层级不超过3层
4. 思维导图必须以 "# 思维导图" 作为开头

请用中文回复。`:`你是一个信息可视化助手。请基于提供的页面总结内容，生成一份简洁的图解示意结构。

要求：
1. 提取总结中的核心要点，用树形结构组织（不超过10个节点）
2. 以 Markdown 标题格式（# 主标题, ## 子节点）组织，最多2层
3. 每个节点名称精炼（8字以内）
4. 思维导图必须以 "# 思维导图" 作为开头

请用中文回复。`;return this.chat([{role:"system",content:a},{role:"user",content:`页面标题：${(t==null?void 0:t.title)||"未知"}

页面总结内容：
${e}

请基于以上总结，生成思维导图。`}],{temperature:.6,maxTokens:r?4096:2048})}}const f=new p;export{f as a};
