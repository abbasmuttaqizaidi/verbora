import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import {
  ApiResponse,
  TrainerProfile,
  TrainerStatItem,
  UpdateTrainerProfileInput,
} from '../types/database'

export const DEFAULT_TRAINER_STATS: TrainerStatItem[] = [
  { number: '10+ Yrs', label: 'Coaching Experience', sub: 'Executive speech & voice mentorship' },
  { number: '12,000+', label: 'Learners Mentored', sub: 'Engineers, leaders & job seekers' },
  { number: '96%', label: 'Fluency Breakthrough', sub: 'Overcoming hesitation & stage fear' },
  { number: '4.9 ★', label: 'Student Rating', sub: 'Across 1,500+ verified alumni reviews' },
]

export const DEFAULT_TRAINER_PHOTO_URL = '/assets/trainer-profile.jpg'

export const DEFAULT_TRAINER_PROFILE: TrainerProfile = {
  id: 'master-trainer',
  hero_kicker: 'Meet Your Master Coach',
  name: 'Bijay Adhikari',
  role_title: 'Founder & Lead Communication Coach at VERBORA',
  quote:
    'Fluency isn’t about using complex, difficult words. It’s about calming your mind, organizing your thoughts with clarity, and speaking with unwavering confidence.',
  bio:
    'With over 10 years of intensive speech mentorship and 12,000+ students coached, Bijay Adhikari has helped engineers, managers, founders, and students break through English anxiety, master executive presence, and unlock their full career potential.',
  photo_url: DEFAULT_TRAINER_PHOTO_URL,
  photo_size_bytes: 0,
  credential_label: 'Certified TESOL Coach',
  experience_label: '10+ Yrs Mentorship',
  learners_label: '12,000+ Alumni',
  rating_label: '4.9★ Rated',
  story_heading: '“I saw brilliant minds silenced by communication fear.”',
  story_body:
    'Throughout my career coaching professionals across tech, banking, and creative industries, I noticed a heartbreaking pattern: deeply intelligent, hard-working individuals were consistently passed over for promotions, froze in client meetings, or remained quiet in discussions simply because they doubted their English fluency.\n\nTraditional institutes made it worse by treating spoken English like a textbook grammar exam. They forced memorization of tenses and complex vocabulary, which only increased overthinking and hesitation.\n\nI founded VERBORA to rewrite that script. We built a safe, empowering environment where communication is treated as a practical sport—where you speak 80% of the time, receive real-time positive feedback, and build emotional confidence that stays with you for life.',
  stats: DEFAULT_TRAINER_STATS,
}

const CORE_TRAINER_COLUMNS =
  'id,name,role_title,quote,bio,photo_url,photo_size_bytes,credential_label,experience_label,learners_label,rating_label,story_heading,story_body,updated_at'

const FULL_TRAINER_COLUMNS = `${CORE_TRAINER_COLUMNS},hero_kicker,stats`

let inMemoryTrainerProfile: TrainerProfile = { ...DEFAULT_TRAINER_PROFILE }
let lastTrainerDbError: string | null = null

export function getTrainerDbError(): string | null {
  return lastTrainerDbError
}

function parseJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T[]
    } catch {
      return fallback
    }
  }
  return fallback
}

function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  return err?.code === 'PGRST204' || err?.code === '42703' || msg.includes('column')
}

export function mapTrainerRow(row: any): TrainerProfile {
  if (!row || typeof row !== 'object') {
    return { ...DEFAULT_TRAINER_PROFILE }
  }
  const rawPhoto = typeof row.photo_url === 'string' ? row.photo_url.trim() : ''
  const resolvedPhoto = rawPhoto || DEFAULT_TRAINER_PHOTO_URL
  const isCustomCloudinaryPhoto = resolvedPhoto.includes('cloudinary.com')
  const resolvedBytes =
    !isCustomCloudinaryPhoto
      ? 0
      : row.photo_size_bytes !== undefined && row.photo_size_bytes !== null
        ? Number(row.photo_size_bytes)
        : 0

  return {
    id: row.id || 'master-trainer',
    hero_kicker: row.hero_kicker || DEFAULT_TRAINER_PROFILE.hero_kicker,
    name: row.name || DEFAULT_TRAINER_PROFILE.name,
    role_title: row.role_title || DEFAULT_TRAINER_PROFILE.role_title,
    quote: row.quote ?? DEFAULT_TRAINER_PROFILE.quote,
    bio: row.bio || DEFAULT_TRAINER_PROFILE.bio,
    photo_url: resolvedPhoto,
    photo_size_bytes: resolvedBytes,
    credential_label: row.credential_label ?? DEFAULT_TRAINER_PROFILE.credential_label,
    experience_label: row.experience_label ?? DEFAULT_TRAINER_PROFILE.experience_label,
    learners_label: row.learners_label ?? DEFAULT_TRAINER_PROFILE.learners_label,
    rating_label: row.rating_label ?? DEFAULT_TRAINER_PROFILE.rating_label,
    story_heading: row.story_heading ?? DEFAULT_TRAINER_PROFILE.story_heading,
    story_body: row.story_body ?? DEFAULT_TRAINER_PROFILE.story_body,
    stats: parseJsonArray<TrainerStatItem>(row.stats, DEFAULT_TRAINER_STATS),
    updated_at: row.updated_at,
  }
}

export async function getTrainerProfile(): Promise<ApiResponse<TrainerProfile>> {
  return executeQuery(async () => {
    let { data, error } = await supabase
      .from('trainer_profile')
      .select(FULL_TRAINER_COLUMNS)
      .eq('id', 'master-trainer')
      .maybeSingle()

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('trainer_profile')
        .select(CORE_TRAINER_COLUMNS)
        .eq('id', 'master-trainer')
        .maybeSingle()
      if (!fallback.error) {
        data = fallback.data as any
        error = null
        lastTrainerDbError =
          'New Trainer Profile columns (hero_kicker, stats) are missing in Supabase. Re-run supabase/schema.sql to persist them.'
      } else {
        error = fallback.error
      }
    } else if (!error) {
      lastTrainerDbError = null
    }

    if (error) {
      lastTrainerDbError =
        error.message || 'Unable to reach public.trainer_profile table in Supabase.'
      return { data: inMemoryTrainerProfile, error: null }
    }

    if (data) {
      const mapped = mapTrainerRow(data)
      inMemoryTrainerProfile = mapped
      return { data: mapped, error: null }
    }

    // Table exists but row missing — seed default record
    const { data: seeded, error: seedError } = await supabase
      .from('trainer_profile')
      .upsert(DEFAULT_TRAINER_PROFILE)
      .select(FULL_TRAINER_COLUMNS)
      .single()

    if (!seedError && seeded) {
      const mapped = mapTrainerRow(seeded)
      inMemoryTrainerProfile = mapped
      return { data: mapped, error: null }
    }

    return { data: inMemoryTrainerProfile, error: null }
  }, inMemoryTrainerProfile)
}

export async function updateTrainerProfile(
  updates: UpdateTrainerProfileInput
): Promise<ApiResponse<TrainerProfile>> {
  const existing = inMemoryTrainerProfile
  const rawNextPhoto =
    updates.photo_url !== undefined ? (updates.photo_url || '').trim() : (existing.photo_url || '')
  const nextPhoto = rawNextPhoto || DEFAULT_TRAINER_PHOTO_URL
  const nextPhotoBytes =
    !nextPhoto.includes('cloudinary.com')
      ? 0
      : updates.photo_size_bytes !== undefined && updates.photo_size_bytes !== null
        ? Math.max(0, Number(updates.photo_size_bytes) || 0)
        : (existing.photo_size_bytes ?? 0)

  const updatedRecord: TrainerProfile = {
    ...existing,
    hero_kicker:
      updates.hero_kicker !== undefined ? updates.hero_kicker.trim() : existing.hero_kicker,
    name: updates.name !== undefined && updates.name.trim() ? updates.name.trim() : existing.name,
    role_title:
      updates.role_title !== undefined && updates.role_title.trim()
        ? updates.role_title.trim()
        : existing.role_title,
    quote: updates.quote !== undefined ? updates.quote.trim() : existing.quote,
    bio: updates.bio !== undefined ? updates.bio.trim() : existing.bio,
    photo_url: nextPhoto,
    photo_size_bytes: nextPhotoBytes,
    credential_label:
      updates.credential_label !== undefined
        ? updates.credential_label.trim()
        : existing.credential_label,
    experience_label:
      updates.experience_label !== undefined
        ? updates.experience_label.trim()
        : existing.experience_label,
    learners_label:
      updates.learners_label !== undefined
        ? updates.learners_label.trim()
        : existing.learners_label,
    rating_label:
      updates.rating_label !== undefined ? updates.rating_label.trim() : existing.rating_label,
    story_heading:
      updates.story_heading !== undefined ? updates.story_heading.trim() : existing.story_heading,
    story_body:
      updates.story_body !== undefined ? updates.story_body.trim() : existing.story_body,
    stats: updates.stats !== undefined ? updates.stats : existing.stats,
    updated_at: new Date().toISOString(),
  }

  const corePayload = {
    id: 'master-trainer',
    name: updatedRecord.name,
    role_title: updatedRecord.role_title,
    quote: updatedRecord.quote,
    bio: updatedRecord.bio,
    photo_url: updatedRecord.photo_url || null,
    photo_size_bytes: updatedRecord.photo_size_bytes ?? 0,
    credential_label: updatedRecord.credential_label,
    experience_label: updatedRecord.experience_label,
    learners_label: updatedRecord.learners_label,
    rating_label: updatedRecord.rating_label,
    story_heading: updatedRecord.story_heading,
    story_body: updatedRecord.story_body,
    updated_at: updatedRecord.updated_at,
  }

  const fullPayload = {
    ...corePayload,
    hero_kicker: updatedRecord.hero_kicker,
    stats: updatedRecord.stats,
  }

  const res = await executeQuery(async () => {
    let { data, error } = await supabase
      .from('trainer_profile')
      .upsert(fullPayload)
      .select(FULL_TRAINER_COLUMNS)
      .single()

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('trainer_profile')
        .upsert(corePayload)
        .select(CORE_TRAINER_COLUMNS)
        .single()
      if (!fallback.error && fallback.data) {
        lastTrainerDbError =
          'New Trainer Profile columns (hero_kicker, stats) are missing in Supabase. Re-run supabase/schema.sql so they save permanently.'
        const mapped = {
          ...updatedRecord,
          ...mapTrainerRow(fallback.data),
          hero_kicker: updatedRecord.hero_kicker,
          stats: updatedRecord.stats,
        }
        inMemoryTrainerProfile = mapped
        return { data: mapped, error: null }
      }
      error = fallback.error || error
    }

    if (error) {
      lastTrainerDbError = error.message || 'Failed to save trainer profile to Supabase.'
      return { data: null, error }
    }

    lastTrainerDbError = null
    if (data) {
      const mapped = mapTrainerRow(data)
      inMemoryTrainerProfile = mapped
      return { data: mapped, error: null }
    }

    inMemoryTrainerProfile = updatedRecord
    return { data: updatedRecord, error: null }
  }, updatedRecord)

  if (res.success && res.data) {
    inMemoryTrainerProfile = res.data
  }

  return res
}
