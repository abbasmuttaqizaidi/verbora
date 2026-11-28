/**
 * Cloudinary Direct Upload Helper for VERBORA Admin
 * Cloud Name: mtjv4nu9
 */

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'mtjv4nu9'

export const DEFAULT_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'verbora_uploads'

export const PRESET_STORAGE_KEY = 'verbora_cloudinary_upload_preset'

export function getSavedUploadPreset(): string {
  try {
    return localStorage.getItem(PRESET_STORAGE_KEY) || DEFAULT_UPLOAD_PRESET
  } catch {
    return DEFAULT_UPLOAD_PRESET
  }
}

export function saveUploadPreset(preset: string): void {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, preset.trim())
  } catch {}
}

export const MAX_STORAGE_MB = 180
export const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024 // 180 MB quota
export const UPGRADE_STORAGE_BYTES = 1024 * 1024 * 1024 // 1 GB upgrade

export interface CloudinaryUploadResult {
  url: string | null
  publicId?: string | null
  error: string | null
  bytes?: number
  format?: string
  duration?: number
}

/**
 * Upload a video file directly to Cloudinary using an unsigned upload preset.
 * Enforces per-file check and total quota check.
 */
export async function uploadVideoToCloudinary(
  file: File,
  currentUsedBytes: number = 0,
  presetOverride?: string,
  folder: string = 'verbora/testimonials/videos'
): Promise<CloudinaryUploadResult> {
  const preset = (presetOverride || getSavedUploadPreset()).trim()

  if (!file) {
    return { url: null, error: 'No video file selected.' }
  }

  // Validate video MIME type
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i)) {
    return { url: null, error: 'Selected file is not a supported video (expected MP4, MOV, WEBM, etc).' }
  }

  // Quota check: ensure adding this video does not exceed storage limit
  const projectedBytes = currentUsedBytes + file.size
  if (projectedBytes > MAX_STORAGE_BYTES) {
    const freeBytes = Math.max(0, MAX_STORAGE_BYTES - currentUsedBytes)
    const freeMB = (freeBytes / (1024 * 1024)).toFixed(1)
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      url: null,
      error: `Storage Quota Exceeded! Video size is ${fileMB} MB, but only ${freeMB} MB space is remaining in your ${MAX_STORAGE_MB} MB free plan. Please upgrade to 1 GB for ₹150/month.`,
    }
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)
  formData.append('folder', folder)

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`

  try {
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      const errorMsg =
        data.error?.message ||
        `Cloudinary video upload failed with status ${response.status}: ${response.statusText}`
      return { url: null, error: errorMsg }
    }

    if (presetOverride) {
      saveUploadPreset(presetOverride)
    }

    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
      bytes: data.bytes || file.size,
      format: data.format,
      duration: data.duration,
      error: null,
    }
  } catch (err: any) {
    return {
      url: null,
      error: err?.message || 'Network error while uploading video to Cloudinary.',
    }
  }
}

/**
 * Resizes & compresses heavy photos client-side into WebP before uploading
 * so multi-megabyte images upload in fractions of a second and consume less quota.
 */
async function optimizeImageForUpload(
  file: File,
  maxDimension: number = 1000
): Promise<File> {
  if (
    typeof document === 'undefined' ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    file.size <= 140 * 1024
  ) {
    return file
  }

  try {
    const bitmap =
      typeof createImageBitmap === 'function'
        ? await createImageBitmap(file)
        : await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            const objectUrl = URL.createObjectURL(file)
            img.onload = () => {
              URL.revokeObjectURL(objectUrl)
              resolve(img)
            }
            img.onerror = err => {
              URL.revokeObjectURL(objectUrl)
              reject(err)
            }
            img.src = objectUrl
          })

    const srcWidth = 'width' in bitmap ? bitmap.width : 0
    const srcHeight = 'height' in bitmap ? bitmap.height : 0
    if (!srcWidth || !srcHeight) {
      if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
      return file
    }

    const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight))
    const targetWidth = Math.max(1, Math.round(srcWidth * scale))
    const targetHeight = Math.max(1, Math.round(srcHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
      return file
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.84)
    )
    if (!blob || blob.size >= file.size) {
      return file
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}

/**
 * Upload an image file directly to Cloudinary using an unsigned upload preset.
 */
export async function uploadImageToCloudinary(
  file: File,
  presetOverride?: string,
  folder: string = 'verbora/testimonials',
  maxRemainingBytes?: number
): Promise<CloudinaryUploadResult> {
  const preset = (presetOverride || getSavedUploadPreset()).trim()

  if (!file) {
    return { url: null, error: 'No image file selected.' }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Selected file is not an image (expected JPG, PNG, WEBP, etc).' }
  }

  // Guard extreme raw file sizes above 20MB before decoding
  if (file.size > 20 * 1024 * 1024) {
    return { url: null, error: 'Image size exceeds 20MB limit.' }
  }

  const maxDimension = folder.includes('courses') ? 1000 : 640
  const uploadFile = await optimizeImageForUpload(file, maxDimension)

  if (uploadFile.size > 10 * 1024 * 1024) {
    return { url: null, error: 'Image size exceeds 10MB limit.' }
  }

  if (maxRemainingBytes !== undefined && uploadFile.size > maxRemainingBytes) {
    const freeMB = (Math.max(0, maxRemainingBytes) / (1024 * 1024)).toFixed(1)
    const fileMB = (uploadFile.size / (1024 * 1024)).toFixed(1)
    return {
      url: null,
      error: `Storage Quota Exceeded! Compressed image is ${fileMB} MB, only ${freeMB} MB remaining.`,
    }
  }

  const formData = new FormData()
  formData.append('file', uploadFile)
  formData.append('upload_preset', preset)
  formData.append('folder', folder)

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

  try {
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      const errorMsg =
        data.error?.message ||
        `Cloudinary upload failed with status ${response.status}: ${response.statusText}`
      return { url: null, error: errorMsg }
    }

    // Save preset on success
    if (presetOverride) {
      saveUploadPreset(presetOverride)
    }

    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
      bytes: data.bytes || uploadFile.size,
      error: null,
    }
  } catch (err: any) {
    return {
      url: null,
      error: err?.message || 'Network error while uploading image to Cloudinary.',
    }
  }
}

/**
 * Extracts Cloudinary public_id from a Cloudinary URL
 * Example: https://res.cloudinary.com/demo/video/upload/v12345/verbora/testimonials/sample.mp4 -> verbora/testimonials/sample
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null
  try {
    const parts = url.split('/upload/')
    if (parts.length < 2) return null
    // Remove version segment (e.g. v1711234567/)
    const afterUpload = parts[1].replace(/^v\d+\//, '')
    // Remove extension (.mp4, .jpg, etc)
    const publicId = afterUpload.replace(/\.[^/.]+$/, '')
    return publicId || null
  } catch {
    return null
  }
}

/**
 * Permanently deletes media asset from Cloudinary via serverless API
 */
export async function deleteMediaFromCloudinary(
  publicIdOrUrl: string,
  resourceType: 'video' | 'image' = 'video'
): Promise<{ success: boolean; error?: string }> {
  if (!publicIdOrUrl) return { success: false, error: 'No media specified' }

  let publicId = publicIdOrUrl
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    const extracted = extractCloudinaryPublicId(publicIdOrUrl)
    if (extracted) {
      publicId = extracted
    }
  }

  try {
    const res = await fetch('/api/delete-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        resource_type: resourceType,
      }),
    })

    const data = await res.json().catch(() => null)
    if (res.ok && data?.success) {
      console.log(`[Cloudinary] Successfully destroyed ${resourceType}:`, publicId)
      return { success: true }
    } else {
      console.warn(`[Cloudinary] Deletion returned warning or non-200:`, data)
      return { success: false, error: data?.error || 'Failed to delete asset from Cloudinary' }
    }
  } catch (err: any) {
    console.error('[Cloudinary] Media deletion request failed:', err?.message)
    return { success: false, error: err?.message }
  }
}

