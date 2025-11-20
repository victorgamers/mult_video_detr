# 多流视频交通监控系统

基于 Vue 3 开发的现代化多流视频交通监控系统，支持实时视频流处理、目标检测和智能分析。

## 🚦 功能特性

- **多流视频支持**：同时支持最多 8 个视频流的实时监控
- **多种模型选择**：集成 YOLOv8、DETR、Faster R-CNN 等主流检测模型
- **参数实时调整**：IOU 阈值和置信度阈值 0-1 可调滑动条
- **灵活的视频源**：支持网络视频流和本地视频文件上传
- **实时检测显示**：视频画面叠加检测框和结果列表
- **响应式布局**：自适应不同屏幕尺寸，支持移动端
- **现代化UI**：深色主题，直观的操作界面

## 🛠️ 技术栈

- **前端框架**：Vue 3 + Composition API
- **构建工具**：Vite
- **样式设计**：CSS3 + Flexbox/Grid 布局
- **视频处理**：HTML5 Video API + Canvas 2D
- **状态管理**：Vue 响应式系统

## 📦 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本

```bash
npm run build
```

## 📱 使用说明

### 添加视频流

1. **网络视频流**：在输入框中输入视频URL，点击"添加视频流"
2. **本地视频**：点击"上传本地视频"选择文件

### 参数调整

- **选择模型**：下拉选择框选择检测模型
- **IOU阈值**：调节交并比阈值，控制检测框重叠程度
- **置信度**：调节检测置信度阈值，过滤低置信度结果

### 视频控制

- **播放/暂停**：点击视频右下角控制按钮
- **进度控制**：拖动进度条调整播放位置
- **移除视频**：点击视频右上角"❌"按钮

## 🎯 检测功能

### 支持的检测类别

- 🚗 汽车 (car)
- 🚚 卡车 (truck) 
- 🚌 公交车 (bus)
- 🏍️ 摩托车 (motorcycle)
- 🚲 自行车 (bicycle)
- 👤 行人 (person)
- 🚦 交通灯 (traffic light)
- 🛑 停止标志 (stop sign)

### 实时显示

- 视频画面实时叠加检测框
- 检测结果列表显示类别和置信度
- 实时FPS和检测数量统计

## 🎨 界面特色

- **深色主题**：专业监控界面风格
- **毛玻璃效果**：现代UI设计元素
- **流畅动画**：平滑的交互过渡效果
- **响应式网格**：自适应视频流布局
- **直观控制**：清晰的图标和操作提示

## 🔧 自定义配置

### 模型配置

在 `src/components/TrafficVideoDetector.vue` 中修改模型选项：

```javascript
const modelOptions = [
  { value: 'yolov8', label: 'YOLOv8' },
  { value: 'detr', label: 'DETR' },
  { value: 'faster-rcnn', label: 'Faster R-CNN' }
]
```

### 检测类别配置

在 `src/components/VideoStream.vue` 中修改类别颜色映射：

```javascript
const classColors = {
  'car': '#3b82f6',
  'truck': '#ef4444',
  // ... 更多类别
}
```

## 🚀 部署说明

### 静态部署

```bash
npm run build
# 将 dist 目录部署到静态服务器
```

### 容器化部署

创建 Dockerfile：

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

## 📈 性能优化

- 视频流懒加载
- 检测结果缓存
- Canvas 渲染优化
- 内存泄漏预防

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题请联系项目维护者。