import { ref, computed, onUnmounted } from 'vue'
import type { VideoStream, ModelType } from '@/types'

export function useTrafficDetector() {
  // 响应式数据
  const selectedModel = ref<ModelType>('yolov8')
  const iouThreshold = ref<number>(0.5)
  const confidenceThreshold = ref<number>(0.7)
  const newVideoSource = ref<string>('')
  const fileInput = ref<HTMLInputElement | null>(null)

  // 模态框相关数据
  const selectedVideo = ref<(VideoStream & { currentTime?: number; isPlaying?: boolean }) | null>(null)
  const zoomLevel = ref<number>(1)
  const isDragging = ref<boolean>(false)
  const startX = ref<number>(0)
  const startY = ref<number>(0)
  const translateX = ref<number>(0)
  const translateY = ref<number>(0)
  const modalVideo = ref<HTMLVideoElement | null>(null)
  const modalVideoContainer = ref<HTMLDivElement | null>(null)

  // 播放时间同步相关
  const syncInterval = ref<NodeJS.Timeout | null>(null)

  // 视频流数据
  const videoStreams = ref<VideoStream[]>([
    {
      id: 'demo1',
      source: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      name: '示例视频1',
      type: 'url'
    }
  ])

  // 计算属性
  const activeDetections = computed<number>(() => {
    return videoStreams.value.filter(stream => stream.isPlaying || false).length
  })

  // 强制更新函数（用于解决滑动条数值显示问题）
  const forceUpdate = (): void => {
    // 触发响应式更新
    iouThreshold.value = parseFloat(iouThreshold.value.toString())
    confidenceThreshold.value = parseFloat(confidenceThreshold.value.toString())
  }

  // 方法
  const getModelName = (model: ModelType): string => {
    const modelNames: Record<ModelType, string> = {
      'yolov8': 'YOLOv8',
      'detr': 'DETR',
      'faster-rcnn': 'Faster R-CNN'
    }
    return modelNames[model] || '未知模型'
  }

  const addVideoSource = (): void => {
    if (videoStreams.value.length >= 8) {
      alert('最多只能添加8个视频流')
      return
    }
    
    if (newVideoSource.value.trim()) {
      const newStream: VideoStream = {
        id: 'stream_' + Date.now(),
        source: newVideoSource.value.trim(),
        name: `视频流${videoStreams.value.length + 1}`,
        type: newVideoSource.value.startsWith('http') ? 'url' : 'file'
      }
      
      videoStreams.value.push(newStream)
      newVideoSource.value = ''
    }
  }

  const triggerFileUpload = (): void => {
    if (videoStreams.value.length >= 8) {
      alert('最多只能添加8个视频流')
      return
    }
    fileInput.value?.click()
  }

  const handleFileUpload = (event: Event): void => {
    const target = event.target as HTMLInputElement
    const files = target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (videoStreams.value.length >= 8) return
        
        if (file.type.startsWith('video/')) {
          const fileUrl = URL.createObjectURL(file)
          const newStream: VideoStream = {
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
      target.value = ''
    }
  }

  const removeVideoStream = (index: number): void => {
    videoStreams.value.splice(index, 1)
  }

  // 模态框相关方法
  const openVideoModal = (stream: VideoStream & { currentTime?: number; isPlaying?: boolean }): void => {
    selectedVideo.value = stream
    zoomLevel.value = 1
    translateX.value = 0
    translateY.value = 0
    document.body.style.overflow = 'hidden'
    
    // 开始同步播放时间
    startPlaybackSync()
  }

  const closeVideoModal = (): void => {
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

  const onModalVideoLoaded = (): void => {
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

  const zoomIn = (): void => {
    if (zoomLevel.value < 3) {
      zoomLevel.value += 0.2
      updateVideoTransform()
    }
  }

  const zoomOut = (): void => {
    if (zoomLevel.value > 0.5) {
      zoomLevel.value -= 0.2
      updateVideoTransform()
    }
  }

  const resetZoom = (): void => {
    zoomLevel.value = 1
    translateX.value = 0
    translateY.value = 0
    updateVideoTransform()
  }

  const updateVideoTransform = (): void => {
    if (modalVideo.value) {
      modalVideo.value.style.transform = `scale(${zoomLevel.value}) translate(${translateX.value}px, ${translateY.value}px)`
    }
  }

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (event.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  // 拖拽功能
  const handleMouseDown = (event: MouseEvent): void => {
    if (zoomLevel.value > 1) {
      isDragging.value = true
      startX.value = event.clientX - translateX.value
      startY.value = event.clientY - translateY.value
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }

  const handleMouseMove = (event: MouseEvent): void => {
    if (isDragging.value) {
      translateX.value = event.clientX - startX.value
      translateY.value = event.clientY - startY.value
      updateVideoTransform()
    }
  }

  const handleMouseUp = (): void => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // 触摸功能
  const handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 1 && zoomLevel.value > 1) {
      isDragging.value = true
      startX.value = event.touches[0].clientX - translateX.value
      startY.value = event.touches[0].clientY - translateY.value
    }
  }

  const handleTouchMove = (event: TouchEvent): void => {
    if (event.touches.length === 1 && isDragging.value) {
      event.preventDefault()
      translateX.value = event.touches[0].clientX - startX.value
      translateY.value = event.touches[0].clientY - startY.value
      updateVideoTransform()
    }
  }

  const handleTouchEnd = (): void => {
    isDragging.value = false
  }

  // 播放同步相关方法
  const startPlaybackSync = (): void => {
    // 每500ms同步一次播放时间（可选功能，如果需要更精确的同步）
    syncInterval.value = setInterval(() => {
      if (modalVideo.value && selectedVideo.value) {
        selectedVideo.value.currentTime = modalVideo.value.currentTime
      }
    }, 500)
  }

  const stopPlaybackSync = (): void => {
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

  return {
    // 响应式数据
    selectedModel,
    iouThreshold,
    confidenceThreshold,
    newVideoSource,
    fileInput,
    selectedVideo,
    zoomLevel,
    isDragging,
    startX,
    startY,
    translateX,
    translateY,
    modalVideo,
    modalVideoContainer,
    syncInterval,
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
    updateVideoTransform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    startPlaybackSync,
    stopPlaybackSync
  }
}