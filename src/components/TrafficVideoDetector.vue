<template>
  <div class="traffic-detector">
    <!-- 顶部控制栏 -->
    <div class="control-panel">
      <div class="panel-section">
        <h2>🚦 多流视频交通监控系统</h2>
        
        <div class="controls">
          <!-- 模型选择 -->
          <div class="control-group">
            <label for="model-select">选择模型：</label>
            <select id="model-select" v-model="selectedModel" class="control-input">
              <option value="yolov8">YOLOv8</option>
              <option value="detr">DETR</option>
              <option value="faster-rcnn">Faster R-CNN</option>
            </select>
          </div>

          <!-- 参数控制 -->
          <div class="control-group">
            <label>IOU阈值：<span class="value-display">{{ iouThreshold.toFixed(2) }}</span></label>
            <input 
              type="range" 
              v-model="iouThreshold" 
              min="0" 
              max="1" 
              step="0.01" 
              class="slider"
              @input="forceUpdate"
            >
          </div>

          <div class="control-group">
            <label>置信度：<span class="value-display">{{ confidenceThreshold.toFixed(2) }}</span></label>
            <input 
              type="range" 
              v-model="confidenceThreshold" 
              min="0" 
              max="1" 
              step="0.01" 
              class="slider"
              @input="forceUpdate"
            >
          </div>
        </div>
      </div>

      <!-- 视频源添加 -->
      <div class="video-source-panel">
        <div class="source-input">
          <input 
            v-model="newVideoSource" 
            placeholder="输入视频URL或本地文件路径" 
            class="source-input-field"
            @keyup.enter="addVideoSource"
          >
          <button @click="addVideoSource" class="add-btn" :disabled="videoStreams.length >= 8">
            ➕ 添加视频流
          </button>
        </div>
        
        <div class="file-upload">
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileUpload" 
            accept="video/*" 
            multiple
            style="display: none"
          >
          <button @click="triggerFileUpload" class="upload-btn" :disabled="videoStreams.length >= 8">
            📁 上传本地视频
          </button>
        </div>
      </div>
    </div>

    <!-- 视频流网格 -->
    <div class="video-grid" :class="`grid-${Math.min(videoStreams.length, 4)}`">
      <VideoStream 
        v-for="(stream, index) in videoStreams" 
        :key="stream.id"
        :stream="stream"
        :model="selectedModel"
        :iou-threshold="iouThreshold"
        :confidence-threshold="confidenceThreshold"
        @remove="removeVideoStream(index)"
        @video-click="openVideoModal"
        class="video-item"
      />
    </div>

    <!-- 状态信息 -->
    <div class="status-bar">
      <div class="status-info">
        <span>活跃视频流：{{ videoStreams.length }}/8</span>
        <span>当前模型：{{ getModelName(selectedModel) }}</span>
        <span>检测中：{{ activeDetections }} 个</span>
      </div>
    </div>

    <!-- 视频放大模态框 -->
    <div v-if="selectedVideo" class="video-modal" @click.self="closeVideoModal" @touchstart.self="handleTouchStart" @touchmove.self="handleTouchMove" @touchend.self="handleTouchEnd">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedVideo.name }}</h3>
          <button @click="closeVideoModal" class="close-btn">✖</button>
        </div>
        
        <div class="video-container-modal" ref="modalVideoContainer" @wheel="handleWheel" @mousedown="handleMouseDown">
          <video 
            ref="modalVideo"
            :src="selectedVideo.source"
            @loadedmetadata="onModalVideoLoaded"
            class="modal-video"
            controls
            autoplay
          ></video>
        </div>
        
        <div class="modal-controls">
          <button @click="zoomIn" class="zoom-btn">🔍+</button>
          <button @click="zoomOut" class="zoom-btn">🔍-</button>
          <button @click="resetZoom" class="zoom-btn">↺</button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import VideoStream from './VideoStream.vue'

// 响应式数据
const selectedModel = ref('yolov8')
const iouThreshold = ref(0.5)
const confidenceThreshold = ref(0.7)
const newVideoSource = ref('')
const fileInput = ref(null)

// 模态框相关数据
const selectedVideo = ref(null)
const zoomLevel = ref(1)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const modalVideo = ref(null)
const modalVideoContainer = ref(null)

// 播放时间同步相关
const syncInterval = ref(null)

// 视频流数据
const videoStreams = ref([
  {
    id: 'demo1',
    source: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    name: '示例视频1',
    type: 'url'
  }
])

// 计算属性
const activeDetections = computed(() => {
  return videoStreams.value.filter(stream => stream.isPlaying || false).length
})

// 强制更新函数（用于解决滑动条数值显示问题）
const forceUpdate = () => {
  // 触发响应式更新
  iouThreshold.value = parseFloat(iouThreshold.value)
  confidenceThreshold.value = parseFloat(confidenceThreshold.value)
}

// 方法
const getModelName = (model) => {
  const modelNames = {
    'yolov8': 'YOLOv8',
    'detr': 'DETR',
    'faster-rcnn': 'Faster R-CNN'
  }
  return modelNames[model] || '未知模型'
}

const addVideoSource = () => {
  if (videoStreams.value.length >= 8) {
    alert('最多只能添加8个视频流')
    return
  }
  
  if (newVideoSource.value.trim()) {
    const newStream = {
      id: 'stream_' + Date.now(),
      source: newVideoSource.value.trim(),
      name: `视频流${videoStreams.value.length + 1}`,
      type: newVideoSource.value.startsWith('http') ? 'url' : 'file'
    }
    
    videoStreams.value.push(newStream)
    newVideoSource.value = ''
  }
}

const triggerFileUpload = () => {
  if (videoStreams.value.length >= 8) {
    alert('最多只能添加8个视频流')
    return
  }
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const files = event.target.files
  if (files.length > 0) {
    Array.from(files).forEach(file => {
      if (videoStreams.value.length >= 8) return
      
      if (file.type.startsWith('video/')) {
        const fileUrl = URL.createObjectURL(file)
        const newStream = {
          id: 'file_' + Date.now(),
          source: fileUrl,
          name: file.name,
          type: 'file',
          file: file
        }
        
        videoStreams.value.push(newStream)
      }
    })
    
    // 重置文件输入
    event.target.value = ''
  }
}

const removeVideoStream = (index) => {
  videoStreams.value.splice(index, 1)
}

// 模态框相关方法
const openVideoModal = (stream) => {
  selectedVideo.value = stream
  zoomLevel.value = 1
  translateX.value = 0
  translateY.value = 0
  document.body.style.overflow = 'hidden'
  
  // 开始同步播放时间
  startPlaybackSync()
}

const closeVideoModal = () => {
  // 在关闭前同步播放时间回原始视频（这里简化处理，实际项目可以通过事件总线或状态管理实现）
  if (modalVideo.value && selectedVideo.value) {
    selectedVideo.value.currentTime = modalVideo.value.currentTime
  }
  
  selectedVideo.value = null
  zoomLevel.value = 1
  translateX.value = 0
  translateY.value = 0
  document.body.style.overflow = 'auto'
  
  // 停止同步
  stopPlaybackSync()
}

const onModalVideoLoaded = () => {
  if (modalVideo.value && modalVideoContainer.value && selectedVideo.value) {
    // 设置视频播放时间到原始播放位置
    if (selectedVideo.value.currentTime) {
      modalVideo.value.currentTime = selectedVideo.value.currentTime
    }
    
    // 如果原始视频正在播放，则模态框视频也自动播放
    if (selectedVideo.value.isPlaying) {
      modalVideo.value.play().catch(error => {
        console.log('自动播放失败，可能需要用户手动播放:', error)
      })
    }
  }
}

const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.2
    updateVideoTransform()
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.2
    updateVideoTransform()
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
  translateX.value = 0
  translateY.value = 0
  updateVideoTransform()
}

const updateVideoTransform = () => {
  if (modalVideo.value) {
    modalVideo.value.style.transform = `scale(${zoomLevel.value}) translate(${translateX.value}px, ${translateY.value}px)`
  }
}

const handleWheel = (event) => {
  event.preventDefault()
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 拖拽功能
const handleMouseDown = (event) => {
  if (zoomLevel.value > 1) {
    isDragging.value = true
    startX.value = event.clientX - translateX.value
    startY.value = event.clientY - translateY.value
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (event) => {
  if (isDragging.value) {
    translateX.value = event.clientX - startX.value
    translateY.value = event.clientY - startY.value
    updateVideoTransform()
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 触摸功能
const handleTouchStart = (event) => {
  if (event.touches.length === 1 && zoomLevel.value > 1) {
    isDragging.value = true
    startX.value = event.touches[0].clientX - translateX.value
    startY.value = event.touches[0].clientY - translateY.value
  }
}

const handleTouchMove = (event) => {
  if (event.touches.length === 1 && isDragging.value) {
    event.preventDefault()
    translateX.value = event.touches[0].clientX - startX.value
    translateY.value = event.touches[0].clientY - startY.value
    updateVideoTransform()
  }
}

const handleTouchEnd = () => {
  isDragging.value = false
}

// 播放同步相关方法
const startPlaybackSync = () => {
  // 每500ms同步一次播放时间（可选功能，如果需要更精确的同步）
  syncInterval.value = setInterval(() => {
    if (modalVideo.value && selectedVideo.value) {
      selectedVideo.value.currentTime = modalVideo.value.currentTime
    }
  }, 500)
}

const stopPlaybackSync = () => {
  if (syncInterval.value) {
    clearInterval(syncInterval.value)
    syncInterval.value = null
  }
}

// 生命周期清理
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  stopPlaybackSync()
  document.body.style.overflow = 'auto'
})
</script>

<style scoped>
.traffic-detector {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 20px;
}

.control-panel {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-section h2 {
  color: #60a5fa;
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.controls {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  align-items: center;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.control-group label {
  color: #cbd5e1;
  font-size: 0.9rem;
}

.control-input, .slider {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.slider {
  -webkit-appearance: none;
  height: 6px;
  background: #475569;
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #60a5fa;
  border-radius: 50%;
  cursor: pointer;
}

.video-source-panel {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.source-input {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 300px;
}

.source-input-field {
  flex: 1;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 10px 15px;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.add-btn, .upload-btn {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.add-btn:hover:not(:disabled), .upload-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  transform: translateY(-1px);
}

.add-btn:disabled, .upload-btn:disabled {
  background: #475569;
  cursor: not-allowed;
  opacity: 0.6;
}

.video-grid {
  display: grid;
  gap: 20px;
  margin-bottom: 20px;
}

.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

.video-item {
  background: rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
}

.video-item:hover {
  transform: translateY(-2px);
}

.status-bar {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 15px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-info {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.9rem;
}

@media (max-width: 1200px) {
  .grid-4 { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
  .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .controls { flex-direction: column; align-items: stretch; }
  .source-input { min-width: auto; }
}

@media (max-width: 600px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .status-info { flex-direction: column; gap: 10px; }
  .video-source-panel { flex-direction: column; align-items: stretch; }
}

/* 模态框样式 */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  width: 90vw;
  height: 90vh;
  max-width: 1200px;
  max-height: 800px;
  background: rgba(30, 41, 59, 0.95);
  border-radius: 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  color: #e2e8f0;
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 5px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ef4444;
}

.video-container-modal {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  cursor: grab;
}

.video-container-modal:active {
  cursor: grabbing;
}

.modal-video {
  max-width: 100%;
  max-height: 100%;
  transform-origin: center;
  transition: transform 0.1s ease;
}

.modal-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 15px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.zoom-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  min-width: 40px;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.zoom-level {
  color: #60a5fa;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

/* 响应式模态框 */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    height: 95vh;
    max-width: none;
    max-height: none;
  }
  
  .modal-header {
    padding: 15px 20px;
  }
  
  .modal-controls {
    padding: 10px 15px;
    gap: 10px;
  }
  
  .zoom-btn {
    padding: 6px 10px;
    font-size: 0.8rem;
    min-width: 35px;
  }
}
</style>