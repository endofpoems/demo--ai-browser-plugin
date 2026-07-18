# 技术方案记录 (Study)

> 项目：AI 网页学习助手 | 更新：2026-07-18

---

## 1. 可拖拽 + Resize 面板

**原理**：标题栏 mousedown 拖拽（记录 getBoundingClientRect()）。右下角 .ai-resize-handle 独立 mousedown resize。通过 e.target.closest() 排除冲突。resizeEnd 时触导航图重渲染（reRenderMindmap）。

**优点**：纯 JS 无库；边界限制；自动百分比→像素切换。

---

## 2. 思维导图展开/收回 + 缓存

**原理**：toggleMindmap() 统一展开/收回。el-collapse-transition 动画（width transition）。cachedMindmapSvg + cachedMindmapTree 缓存，再次打开直接显示不重载。箭头与面板同侧切换。

**优点**：一键开关；缓存避免重复 AI 调用；视觉流畅。

---

## 3. 树状思维导图（Tree Layout）

**原理**：递归布局+子树跨度计算。calcSpan 计算每节点叶子数确定垂直空间分配。layoutNodes 递归：x = padding + depth * (nodeW+hGap)，y = curY + blockH/2 - nodeH/2。三次贝塞尔连线（C曲线）从左到右。容器尺寸动态自适应（nodeW/H 基于 availW/availH 和 depth）。支持点击收起子树（collapsed Set → calcSpan跳过→子树不占空间）。外层 div :style 绑定 scale/translate 实现缩放平移。连线 stroke-dasharray 动画 + 节点 stagger fadeIn。

**优点**：从左到右阅读直觉；子树自动居中；节点永不重叠；支持交互（缩放/平移/折叠）。

**流程**：树数据→calcDepth→自适应参数→calcSpan→layoutNodes 递归坐标→连线→节点渲染→v-html。

---

## 4. AI 语义化思维导图生成

**原理**：generateMindmap 提示词重构为五维度结构（🔍是什么/why、💡为什么/why、🎯场景/scenario、✅优点/advantage、❌缺点/disadvantage）。parseMindmapMarkdown 提取 icon + type 标记（`## icon name (type)`），节点携带 color 属性。非技术内容走简化双维度（📋要点/point、🔗关联/relation）。

**优点**：AI 输出结构化和可视化分离；icon/颜色语义映射提升可读性；名称截断（truncateNodeName）保证节点整洁。

---

## 5. 划词链式解释

**原理**：tooltipChain reactive([])，每 tooltip 独立 { id,label,summary,x,y,loading }。首次划词直接解释，后续划词解释上一 summary。preventNextTooltip 标志位+ mousedown.stop 解决×按钮冒新弹窗。draggingTipId 校验+ removeAllRanges() 防拖拽残留焦点。

**优点**：链式语义；独立拖拽/关闭；多重防护防误触。
