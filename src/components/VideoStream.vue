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

<script setup lang="ts">
import { onMounted } from 'vue'
import { useVideoStream } from '../composables/useVideoStream'
import type { VideoStreamProps, VideoStreamEmits } from '@/types'

// 属性定义
const props = defineProps<VideoStreamProps>()

// 事件定义
const emit = defineEmits<VideoStreamEmits>()

// 使用组合式函数
const {
  // 响应式数据
  videoElement,
  detectionCanvas,
  isPlaying,
  isLoading,
  hasError,
  currentTime,
  duration,
  fps,
  detectionCount,
  detections,
  
  // 方法
  setupCanvas,
  getTypeLabel,
  getDetectionColor,
  onVideoLoaded,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  togglePlay,
  removeStream,
  seekVideo,
  retryLoad,
  formatTime,
  handleVideoClick
} = useVideoStream(props, emit)

// 生命周期
onMounted(() => {
  setupCanvas()
})
</script>

<style>
@import '../styles/VideoStream.css';
</style>