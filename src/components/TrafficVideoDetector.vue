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
    <div 
      v-if="selectedVideo" 
      class="video-modal" 
      @click.self="closeVideoModal" 
      @touchstart.self="handleTouchStart" 
      @touchmove.self="handleTouchMove" 
      @touchend.self="handleTouchEnd"
    >
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

<script setup lang="ts">
import VideoStream from './VideoStream.vue'
import { useTrafficDetector } from '../composables/useTrafficDetector'

// 使用组合式函数
const {
  // 响应式数据
  selectedModel,
  iouThreshold,
  confidenceThreshold,
  newVideoSource,
  fileInput,
  selectedVideo,
  zoomLevel,
  modalVideo,
  modalVideoContainer,
  videoStreams,
  
  // 计算属性
  activeDetections,
  
  // 方法
  forceUpdate,
  getModelName,
  addVideoSource,
  triggerFileUpload,
  handleFileUpload,
  removeVideoStream,
  openVideoModal,
  closeVideoModal,
  onModalVideoLoaded,
  zoomIn,
  zoomOut,
  resetZoom,
  handleWheel,
  handleMouseDown,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
} = useTrafficDetector()
</script>

<style>
@import '../styles/TrafficVideoDetector.css';
</style>