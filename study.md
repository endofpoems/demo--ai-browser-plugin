# 技术方案记录 (Study)

> 项目：AI 网页学习助手 | 更新：2026-07-18

---

## 1. 可拖拽 + Resize 面板

**原理**：面板标题栏 mousedown 实现拖拽（记录 getBoundingClientRect() 偏移）。右下角 .ai-resize-handle 独立 mousedown 实现 resize（存档宽高+起始坐标，mousemove 更新 width/height）。两者通过 e.target.closest() 排除冲突。

**优点**：纯 JS 无库依赖；边界限制防溢出；自动从百分比切换到像素定位。

**流程**：拖拽标题→存档偏移→mousemove 更新 left/top→mouseup 清理。拖拽右下角→存档宽高→mousemove 更新 width/height→mouseup 清理+同步导图。

---

## 2. 思维导图箭头切换 + 缓存

**原理**：`toggleMindmap()` 统一处理展开/收回。展开时设置导图位置+宽度触发 CSS transition 动画。导图面板外边缘显示红色反向箭头（`.ai-mindmap-arrow-close`），点击收回（width→0，400ms 后隐藏）。`cachedMindmapSvg` 缓存已渲染 SVG，再次展开直接显示无需重载。

**优点**：一键切换开关模式；缓存避免重复 AI 调用和渲染；箭头颜色区分（紫色展开/红色收回）。

**流程**：点击箭头→`toggleMindmap`→展开时设置位置+触发动画→有缓存直接显示/无缓存加载生成→缓存 SVG。再次点击→width→0 动画→隐藏。

**动画方案**：采用 `transition: width 0.35s cubic-bezier(0.4,0,0.2,1)` 模拟 el-collapse-transition 折叠展开效果。展开时 header/body 延迟 0.12s 后 opacity 从 0→1 淡入，收回时 width→0 自动裁剪内容。通过 `.ai-mindmap-open` class 控制内容可见性，避免 CSS 属性选择器脆弱性。

---

## 3. 思维导图跟随面板 Resize + 自适应

**原理**：`syncMindmapPosition()` 在 `onPanelDragMove`、`onResizeEnd` 中调用。导图宽度跟随面板宽度（`mmW = pr.width`），高度同步面板高度。Resize 结束后重新渲染 SVG 以适应新容器尺寸。

**优点**：导图始终与总结面板保持相同尺寸，视觉统一；SVG 自适应容器（width:100%, height:100%）。

**流程**：面板拖拽/Resize→`syncMindmapPosition()`→更新导图 left/top/width/height→重新渲染 SVG。

---

## 4. 放射状思维导图（Radial Layout）

**原理**：BFS 分层+极坐标定位。根节点居中，子节点按层级分布在同心圆环上（levelRadii=[0,120,240,360]）。每层节点均匀分布角度（2*PI/n）。parentMap 记录父子关系用于绘制二次贝塞尔连线（Q 曲线）。装饰性虚线圆环增强视觉效果。10 色渐变区分层级。

**优点**：放射状布局直观展示层级关系；无方向性偏见（不像树形只有从左到右）；视觉效果美观。

**缺点**：节点多时外围圆环拥挤；固定 viewBox 800×720 需手动调整。

**流程**：树形数据→BFS 分层+记录父子关系→按层级+角度计算极坐标→绘制装饰圆环→绘制连线→绘制节点矩形+文字→返回 SVG。

---

## 5. 划词链式解释

**原理**：`tooltipChain` 为 `reactive([])`，每个 tooltip 独立 `{ id, label, summary, x, y, loading }`。首次划词直接解释选中文本，后续划词解释上一 tooltip 的 summary。位置偏移上一 tooltip（30px, 40px）。每个 tooltip 可独立拖拽和叉掉。`preventNextTooltip` 标志位解决×按钮触发 mouseup 冒新弹窗的问题。

**优点**：链式结构表达深度解释语义；独立拖拽可自由排列；独立关闭灵活管理。

**流程**：选中文本→计算位置→链式 push→AI 调用（sourceText=上一 summary）→更新。关闭：设 preventNextTooltip=true+splice。拖拽：mousedown→记录 draggingTipId→mousemove 更新 tip.x/y。
