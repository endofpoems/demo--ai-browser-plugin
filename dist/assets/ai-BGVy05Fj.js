import{p as h}from"./storage-lhFOGTLa.js";class y{async chat(e,r={}){var a,c,i,m;const o=await h();if(!o.apiKey)throw new Error("请先在设置中配置 API Key");const l=`${o.baseUrl.replace(/\/+$/,"")}/v1/chat/completions`,u={model:o.modelName,messages:e,temperature:r.temperature??.7,max_tokens:r.maxTokens??8192,stream:!1};let n;try{n=await fetch(l,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o.apiKey}`},body:JSON.stringify(u)})}catch(t){throw new Error(`网络请求失败: ${t.message}`)}if(!n.ok){let t=`API 错误: ${n.status}`;try{t=((a=(await n.json()).error)==null?void 0:a.message)||t}catch{}throw new Error(t)}let s;try{s=await n.json()}catch(t){throw new Error(`响应解析失败: ${t.message}`)}if(!((m=(i=(c=s.choices)==null?void 0:c[0])==null?void 0:i.message)!=null&&m.content))throw new Error("AI 返回数据格式异常");return s.choices[0].message.content}async testConnection(){if(!(await h()).apiKey)throw new Error("请先填写 API Key");return this.chat([{role:"user",content:"回复OK"}],{temperature:0,maxTokens:100})}async summarizeWord(e){return this.chat([{role:"system",content:"你是一个知识解释助手。请用一句话（30字以内）通俗易懂地解释给定的词或短语，像百科词条的第一句话那样精炼。"},{role:"user",content:`请解释："${e}"`}],{temperature:.5,maxTokens:2e3})}async summarizePage(e,r){return this.chat([{role:"system",content:`你是一个专业的技术知识分析助手。请对提供的网页内容进行系统性总结归纳。

要求：
1. 围绕"是什么（定义）"、"为什么（背景/原因）"、"使用场景"、"原理机制"四个维度展开
2. 在总结的末尾，额外用 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）生成一个思维导图结构，方便可视化展示
3. 思维导图部分必须以 "## 思维导图" 作为开头
4. 如果内容不是知识/技术类内容，请说明并只给出简要概述

请用中文回复。`},{role:"user",content:`网页标题：${e.title}
网页URL：${e.url}
网页描述：${e.description}

网页主要内容：
${r}`}],{temperature:.7,maxTokens:8192})}async generateMindmap(e,r){return this.chat([{role:"system",content:`你是一个专业知识图谱构建助手。请基于提供的页面总结内容，结合你对该主题的深度知识进行搜索和补充，生成一份结构化的思维导图。

要求：
1. 以 Markdown 标题格式（# 主标题, ## 子标题, ### 细节）组织思维导图
2. 必须包含页面总结中提到的核心概念，并利用你的知识库补充相关的技术细节、应用场景、优缺点等
3. 层级结构清晰，每个节点名称精炼（15字以内）
4. 思维导图必须以 "# 思维导图" 作为开头
5. 至少包含3层深度，覆盖全面

请用中文回复。`},{role:"user",content:`页面标题：${(r==null?void 0:r.title)||"未知"}

页面总结内容：
${e}

请基于以上总结内容，结合你的知识库，生成一份深度思维导图。`}],{temperature:.7,maxTokens:8192})}}const f=new y;export{f as a};
