import { ref, nextTick, onUnmounted, watch } from 'vue'
import type { VideoStreamProps, VideoStreamEmits, Detection } from '@/types'

// 类别颜色映射
const classColors: Record<string, string> = {
  'car': '#3b82f6',
  'truck': '#ef4444',
  'bus': '#10b981',
  'motorcycle': '#f59e0b',
  'bicycle': '#8b5cf6',
  'person': '#ec4899',
  'traffic light': '#06b6d4',
  'stop sign': '#f97316'
}

export function useVideoStream(props: VideoStreamProps, emit: VideoStreamEmits) {
  // 响应式数据
  const videoElement = ref<HTMLVideoElement | null>(null)
  const detectionCanvas = ref<HTMLCanvasElement | null>(null)
  const isPlaying = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const hasError = ref<boolean>(false)
  const currentTime = ref<number>(0)
  const duration = ref<number>(0)
  const fps = ref<number>(0)
  const detectionCount = ref<number>(0)
  const detections = ref<Detection[]>([])

  // 检测器状态
  const canvasContext = ref<CanvasRenderingContext2D | null>(null)
  const animationFrameId = ref<number | null>(null)
  const lastFrameTime = ref<number>(0)

  // 生命周期
  const setupCanvas = (): void => {
    nextTick(() => {
      if (detectionCanvas.value) {
        canvasContext.value = detectionCanvas.value.getContext('2d')
      }
    })
  }

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
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'url': '网络流',
      'file': '本地文件'
    }
    return labels[type] || '未知'
  }

  const getDetectionColor = (className: string): string => {
    return classColors[className] || '#6b7280'
  }

  const onVideoLoaded = (): void => {
    if (videoElement.value) {
      duration.value = videoElement.value.duration
      isLoading.value = false
      
      // 调整画布大小
      if (detectionCanvas.value) {
        detectionCanvas.value.width = videoElement.value.videoWidth
        detectionCanvas.value.height = videoElement.value.videoHeight
      }
    }
  }

  const onTimeUpdate = (): void => {
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

  const onPlay = (): void => {
    isPlaying.value = true
    startDetectionLoop()
  }

  const onPause = (): void => {
    isPlaying.value = false
    stopDetectionLoop()
  }

  const onEnded = (): void => {
    isPlaying.value = false
    stopDetectionLoop()
  }

  const togglePlay = (): void => {
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

  const removeStream = (): void => {
    emit('remove')
  }

  const seekVideo = (event: Event): void => {
    const target = event.target as HTMLInputElement
    if (videoElement.value) {
      videoElement.value.currentTime = parseFloat(target.value)
    }
  }

  const retryLoad = (): void => {
    hasError.value = false
    isLoading.value = true
    if (videoElement.value) {
      videoElement.value.load()
    }
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleVideoClick = (): void => {
    const videoData = {
      ...props.stream,
      currentTime: videoElement.value ? videoElement.value.currentTime : 0,
      isPlaying: isPlaying.value
    }
    emit('video-click', videoData)
  }

  // 检测相关方法
  const simulateDetection = (): void => {
    // 模拟检测结果（实际项目中应调用后端API）
    const simulatedDetections: Detection[] = [
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

  const filterDetections = (): void => {
    // 根据当前阈值重新过滤检测结果
    const filtered = detections.value.filter(
      detection => detection.confidence >= props.confidenceThreshold
    )
    detectionCount.value = filtered.length
    drawDetections(filtered)
  }

  const drawDetections = (detections: Detection[]): void => {
    if (!canvasContext.value || !videoElement.value) return
    
    const ctx = canvasContext.value
    
    // 清空画布
    ctx.clearRect(0, 0, detectionCanvas.value!.width, detectionCanvas.value!.height)
    
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

  const clearDetections = (): void => {
    if (canvasContext.value && detectionCanvas.value) {
      canvasContext.value.clearRect(0, 0, detectionCanvas.value.width, detectionCanvas.value.height)
    }
  }

  const startDetectionLoop = (): void => {
    const animate = (): void => {
      if (isPlaying.value) {
        animationFrameId.value = requestAnimationFrame(animate)
      }
    }
    animate()
  }

  const stopDetectionLoop = (): void => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }

  return {
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
  }
}