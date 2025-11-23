// 视频流类型定义
export interface VideoStream {
  id: string
  source: string
  name: string
  type: 'url' | 'file'
  file?: File
  currentTime?: number
  isPlaying?: boolean
}

// 检测结果类型定义
export interface Detection {
  class: string
  confidence: number
  bbox: [number, number, number, number] // [x, y, width, height]
}

// 模型类型
export type ModelType = 'yolov8' | 'detr' | 'faster-rcnn'

// 组件Props类型定义
export interface VideoStreamProps {
  stream: VideoStream
  model: ModelType
  iouThreshold: number
  confidenceThreshold: number
}

// 事件类型定义
export interface VideoStreamEmits {
  (e: 'remove'): void
  (e: 'video-click', videoData: VideoStream & { currentTime: number; isPlaying: boolean }): void
}

// 模态框状态类型
export interface ModalState {
  selectedVideo: (VideoStream & { currentTime?: number; isPlaying?: boolean }) | null
  zoomLevel: number
  isDragging: boolean
  startX: number
  startY: number
  translateX: number
  translateY: number
}