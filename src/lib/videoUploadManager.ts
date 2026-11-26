import { uploadVideoToCloudinary, deleteMediaFromCloudinary } from './cloudinary'

export interface VideoUploadTask {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  resultUrl?: string
  resultBytes?: number
  error?: string
  startedAt: number
}

type UploadListener = (task: VideoUploadTask | null) => void

let activeTask: VideoUploadTask | null = null
const listeners: Set<UploadListener> = new Set()

export function getActiveVideoUpload(): VideoUploadTask | null {
  return activeTask
}

export function subscribeToVideoUpload(listener: UploadListener): () => void {
  listeners.add(listener)
  listener(activeTask)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners() {
  listeners.forEach(l => l(activeTask))
}

// Window beforeunload protection: if user tries to close tab while video is uploading
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (activeTask && activeTask.status === 'uploading') {
      e.preventDefault()
      e.returnValue = 'A testimonial video is currently uploading. Closing this tab will cancel the process.'
      return e.returnValue
    }
  })
}

/**
 * Starts persistent background upload to Cloudinary.
 * Continues running even if route changes within the application!
 */
export async function startBackgroundVideoUpload(
  file: File,
  currentUsedBytes: number,
  customPreset?: string,
  oldVideoToDelete?: string
): Promise<VideoUploadTask> {
  // If replacing old video, trigger deletion in background
  if (oldVideoToDelete) {
    deleteMediaFromCloudinary(oldVideoToDelete, 'video').catch(() => {})
  }

  const taskId = `upload_${Date.now()}`
  activeTask = {
    id: taskId,
    file,
    progress: 10,
    status: 'uploading',
    startedAt: Date.now(),
  }
  notifyListeners()

  try {
    const res = await uploadVideoToCloudinary(file, currentUsedBytes, customPreset)

    if (res.url) {
      activeTask = {
        ...activeTask,
        status: 'completed',
        progress: 100,
        resultUrl: res.url,
        resultBytes: res.bytes || file.size,
      }
    } else {
      activeTask = {
        ...activeTask,
        status: 'error',
        error: res.error || 'Failed to upload video to Cloudinary.',
      }
    }
  } catch (err: any) {
    activeTask = {
      ...activeTask,
      status: 'error',
      error: err?.message || 'Unexpected network error during upload.',
    }
  }

  notifyListeners()
  return activeTask
}

export function clearVideoUploadTask() {
  activeTask = null
  notifyListeners()
}
