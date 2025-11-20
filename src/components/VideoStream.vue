<template>
  <div class="video-stream">
    <!-- 视频流头部 -->
    <div class="stream-header">
      <div class="stream-info">
        <span class="stream-name">{{ stream.name }}</span>
        <span class="stream-type" :class="stream.type">{{ getTypeLabel(stream.type) }}</span>
      </div>
      <div class="stream-controls">
        <button @click="togglePlay" class="control-btn" :title="isPlaying ? '暂停' : '播放'">
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        <button @click="removeStream" class="control-btn remove-btn" title="移除">
          ❌
        </button>
      </div>
    </div>

    <!-- 视频播放区域 -->
    <div class="video-container" @click="handleVideoClick">
      <video 
        ref="videoElement" 
        :src="stream.source" 
        @loadedmetadata="onVideoLoaded"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        class="video-element"
        crossorigin="anonymous"
      ></video>
      
      <!-- 检测框画布 -->
      <canvas ref="detectionCanvas" class="detection-canvas"></canvas>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
      
      <!-- 错误状态 -->
      <div v-if="hasError" class="error-overlay">
        <span>❌ 视频加载失败</span>
        <button @click="retryLoad" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- 视频控制栏 -->
    <div class="video-controls">
      <div class="progress-bar">
        <input 
          type="range" 
          v-model="currentTime" 
          :max="duration" 
          step="0.1" 
          class="progress-slider"
          @input="seekVideo"
        >
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>
      
      <div class="detection-info">
        <span class="detection-count">检测到 {{ detectionCount }} 个目标</span>
        <span class="fps-display">{{ fps }} FPS</span>
      </div>
    </div>

    <!-- 检测结果列表 -->
    <div class="detection-list" v-if="detections.length > 0">
      <h4>检测结果</h4>
      <div class="detection-items">
        <div 
          v-for="(detection, index) in detections" 
          :key="index"
          class="detection-item"
          :style="{ borderLeftColor: getDetectionColor(detection.class) }"
        >
          <span class="detection-class">{{ detection.class }}</span>
          <span class="detection-confidence">{{ (detection.confidence * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// 属性定义
const props = defineProps({
  stream: {
    type: Object,
    required: true
  },
  model: {
    type: String,
    default: 'yolov8'
  },
  iouThreshold: {
    type: Number,
    default: 0.5
  },
  confidenceThreshold: {
    type: Number,
    default: 0.7
  }
})

// 事件定义
const emit = defineEmits(['remove', 'video-click'])

// 响应式数据
const videoElement = ref(null)
const detectionCanvas = ref(null)
const isPlaying = ref(false)
const isLoading = ref(false)
const hasError = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const fps = ref(0)
const detectionCount = ref(0)
const detections = ref([])

// 检测器状态
const canvasContext = ref(null)
const animationFrameId = ref(null)
const lastFrameTime = ref(0)

// 类别颜色映射
const classColors = {
  'car': '#3b82f6',
  'truck': '#ef4444',
  'bus': '#10b981',
  'motorcycle': '#f59e0b',
  'bicycle': '#8b5cf6',
  'person': '#ec4899',
  'traffic light': '#06b6d4',
  'stop sign': '#f97316'
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    if (detectionCanvas.value) {
      canvasContext.value = detectionCanvas.value.getContext('2d')
    }
  })
})

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})

// 监听器
watch(() => props.model, () => {
  // 模型切换时重置检测
  detections.value = []
  detectionCount.value = 0
  clearDetections()
})

watch(() => props.iouThreshold, () => {
  // IOU阈值变化时重新筛选检测结果
  filterDetections()
})

watch(() => props.confidenceThreshold, () => {
  // 置信度阈值变化时重新筛选检测结果
  filterDetections()
})

// 方法
const getTypeLabel = (type) => {
  const labels = {
    'url': '网络流',
    'file': '本地文件'
  }
  return labels[type] || '未知'
}

const getDetectionColor = (className) => {
  return classColors[className] || '#6b7280'
}

const onVideoLoaded = () => {
  duration.value = videoElement.value.duration
  isLoading.value = false
  
  // 调整画布大小
  if (detectionCanvas.value && videoElement.value) {
    detectionCanvas.value.width = videoElement.value.videoWidth
    detectionCanvas.value.height = videoElement.value.videoHeight
  }
}

const onTimeUpdate = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime
    
    // 计算FPS
    const now = performance.now()
    if (lastFrameTime.value > 0) {
      fps.value = Math.round(1000 / (now - lastFrameTime.value))
    }
    lastFrameTime.value = now
    
    // 模拟检测（实际项目中应调用后端API）
    simulateDetection()
  }
}

const onPlay = () => {
  isPlaying.value = true
  startDetectionLoop()
}

const onPause = () => {
  isPlaying.value = false
  stopDetectionLoop()
}

const onEnded = () => {
  isPlaying.value = false
  stopDetectionLoop()
}

const togglePlay = () => {
  if (!videoElement.value) return
  
  if (isPlaying.value) {
    videoElement.value.pause()
  } else {
    videoElement.value.play().catch(error => {
      console.error('播放失败:', error)
      hasError.value = true
    })
  }
}

const removeStream = () => {
  emit('remove')
}

const seekVideo = (event) => {
  if (videoElement.value) {
    videoElement.value.currentTime = parseFloat(event.target.value)
  }
}

const retryLoad = () => {
  hasError.value = false
  isLoading.value = true
  if (videoElement.value) {
    videoElement.value.load()
  }
}

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const handleVideoClick = () => {
  const videoData = {
    ...props.stream,
    currentTime: videoElement.value ? videoElement.value.currentTime : 0,
    isPlaying: isPlaying.value
  }
  emit('video-click', videoData)
}

// 检测相关方法
const simulateDetection = () => {
  // 模拟检测结果（实际项目中应调用后端API）
  const simulatedDetections = [
    { class: 'car', confidence: 0.85, bbox: [100, 100, 200, 150] },
    { class: 'truck', confidence: 0.78, bbox: [300, 120, 180, 130] },
    { class: 'person', confidence: 0.65, bbox: [50, 200, 80, 120] }
  ]
  
  // 根据置信度阈值过滤
  const filteredDetections = simulatedDetections.filter(
    detection => detection.confidence >= props.confidenceThreshold
  )
  
  detections.value = filteredDetections
  detectionCount.value = filteredDetections.length
  
  // 绘制检测框
  drawDetections(filteredDetections)
}

const filterDetections = () => {
  // 根据当前阈值重新过滤检测结果
  const filtered = detections.value.filter(
    detection => detection.confidence >= props.confidenceThreshold
  )
  detectionCount.value = filtered.length
  drawDetections(filtered)
}

const drawDetections = (detections) => {
  if (!canvasContext.value || !videoElement.value) return
  
  const ctx = canvasContext.value
  
  // 清空画布
  ctx.clearRect(0, 0, detectionCanvas.value.width, detectionCanvas.value.height)
  
  detections.forEach(detection => {
    const [x, y, width, height] = detection.bbox
    const color = getDetectionColor(detection.class)
    
    // 绘制边界框
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
    
    // 绘制标签背景
    ctx.fillStyle = color
    ctx.fillRect(x, y - 20, 80, 20)
    
    // 绘制标签文本
    ctx.fillStyle = 'white'
    ctx.font = '12px Arial'
    ctx.fillText(
      `${detection.class} ${(detection.confidence * 100).toFixed(1)}%`,
      x + 5,
      y - 5
    )
  })
}

const clearDetections = () => {
  if (canvasContext.value && detectionCanvas.value) {
    canvasContext.value.clearRect(0, 0, detectionCanvas.value.width, detectionCanvas.value.height)
  }
}

const startDetectionLoop = () => {
  const animate = () => {
    if (isPlaying.value) {
      animationFrameId.value = requestAnimationFrame(animate)
    }
  }
  animate()
}

const stopDetectionLoop = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
}
</script>

<style scoped>
.video-stream {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stream-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stream-name {
  font-weight: 600;
  color: #e2e8f0;
}

.stream-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stream-type.url {
  background: #3b82f6;
  color: white;
}

.stream-type.file {
  background: #10b981;
  color: white;
}

.stream-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.remove-btn:hover {
  background: #ef4444;
  color: white;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.video-container:hover {
  transform: scale(1.02);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.loading-overlay, .error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  gap: 10px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.video-controls {
  padding: 15px 20px;
  background: rgba(30, 41, 59, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.progress-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  background: #475569;
  border-radius: 2px;
  outline: none;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.time-display {
  display: flex;
  gap: 5px;
  color: #94a3b8;
  font-size: 0.8rem;
  min-width: 80px;
}

.detection-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #94a3b8;
}

.detection-count {
  color: #10b981;
  font-weight: 500;
}

.fps-display {
  color: #f59e0b;
  font-weight: 500;
}

.detection-list {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 120px;
  overflow-y: auto;
}

.detection-list h4 {
  color: #e2e8f0;
  margin-bottom: 10px;
  font-size: 0.9rem;
}

.detection-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
  font-size: 0.8rem;
}

.detection-class {
  color: #e2e8f0;
  font-weight: 500;
}

.detection-confidence {
  color: #94a3b8;
  font-size: 0.75rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stream-header {
    padding: 10px 15px;
  }
  
  .video-controls {
    padding: 10px 15px;
  }
  
  .detection-list {
    padding: 10px 15px;
  }
  
  .progress-bar {
    flex-direction: column;
    gap: 8px;
  }
  
  .time-display {
    align-self: flex-end;
  }
}
</style>