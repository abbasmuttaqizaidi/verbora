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

export interface CloudinaryUploadResult {
  url: string | null
  publicId?: string | null
  error: string | null
}

/**
 * Upload an image file directly to Cloudinary using an unsigned upload preset.
 */
export async function uploadImageToCloudinary(
  file: File,
  presetOverride?: string
): Promise<CloudinaryUploadResult> {
  const preset = (presetOverride || getSavedUploadPreset()).trim()

  if (!file) {
    return { url: null, error: 'No image file selected.' }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Selected file is not an image (expected JPG, PNG, WEBP, etc).' }
  }

  // Limit size to 10MB
  if (file.size > 10 * 1024 * 1024) {
    return { url: null, error: 'Image size exceeds 10MB limit.' }
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)
  formData.append('folder', 'verbora/testimonials')

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
      error: null,
    }
  } catch (err: any) {
    return {
      url: null,
      error: err?.message || 'Network error while uploading image to Cloudinary.',
    }
  }
}
