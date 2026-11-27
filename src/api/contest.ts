import { supabase } from '../lib/supabase'
import { executeQuery } from './client'
import {
  ApiResponse,
  ContestConfig,
  ContestEntry,
  ContestPrizeItem,
  ContestStepItem,
  CreateContestEntryInput,
  UpdateContestConfigInput,
} from '../types/database'

export const DEFAULT_CONTEST_PRIZES: ContestPrizeItem[] = [
  {
    rank: '1st Prize',
    title: '₹15,000 + Full Course Scholarship',
    detail: 'Cash reward plus free 1-on-1 Fluency & Public Speaking mentorship',
  },
  {
    rank: '2nd Prize',
    title: '₹7,500 + 75% Scholarship',
    detail: 'Cash reward plus priority admission to Executive Communication batch',
  },
  {
    rank: 'All Participants',
    title: 'Verified Certificate + Speech Feedback',
    detail: 'Digital participation certificate and personalized fluency scorecard',
  },
]

export const DEFAULT_CONTEST_STEPS: ContestStepItem[] = [
  {
    step: '01',
    title: 'Register Online Free',
    desc: 'Submit your details and choose your category (Student or Working Professional).',
  },
  {
    step: '02',
    title: '2-Min Speaking Round',
    desc: 'Speak clearly on a real-world prompt—evaluated on confidence, clarity, and structure.',
  },
  {
    step: '03',
    title: 'Live Finale & Awards',
    desc: 'Top speakers advance to the live finale judged by VERBORA Master Coaches.',
  },
]

export const DEFAULT_CONTEST_RULES: string[] = [
  'Open to students, fresh graduates, and working professionals across India.',
  'No complex vocabulary required—judging focuses on clarity, confidence, hesitation control, and delivery.',
  'Entries are 100% free; registered participants receive round guidelines via WhatsApp and email.',
  'Each speech round is 2 minutes in English on the assigned real-world topic.',
]

export const DEFAULT_CONTEST_CONFIG: ContestConfig = {
  id: 'active-contest',
  is_active: true,
  badge_text: 'Registrations Open',
  hero_pill_text: 'Join Speech Contest',
  title: 'All-India Spoken English & Confidence Challenge 2026',
  subtitle:
    'Put your voice forward, conquer stage hesitation, win exciting prizes, and earn direct mentorship feedback from VERBORA coaches.',
  topic: 'My Biggest Career Turning Point — Speak Clearly for 2 Minutes in English',
  gmeet_url: '',
  start_date: '',
  end_date: '',
  description:
    '<p><strong>Ready to test and elevate your communication confidence?</strong> The VERBORA Speech &amp; Confidence Challenge gives ambitious students and working professionals a supportive stage to speak clearly, receive actionable expert feedback, and win scholarships plus cash prizes.</p><p>Whether you are preparing for campus placements, corporate promotions, or public speaking, participating itself builds measurable speaking momentum.</p>',
  deadline_label: 'Limited Seats · Round 1 Closes Soon',
  entry_fee_label: 'Free Entry · Open to All',
  show_prizes: true,
  show_steps: true,
  prizes: DEFAULT_CONTEST_PRIZES,
  steps: DEFAULT_CONTEST_STEPS,
  rules: DEFAULT_CONTEST_RULES,
}

const LEGACY_CONTEST_COLUMNS =
  'id,is_active,badge_text,hero_pill_text,title,subtitle,description,deadline_label,entry_fee_label,prizes,steps,rules,updated_at'
const FULL_CONTEST_COLUMNS = `${LEGACY_CONTEST_COLUMNS},topic,gmeet_url,start_date,end_date,show_prizes,show_steps`

function formatSingleDate(iso?: string): string {
  if (!iso) return ''
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatContestSchedule(
  startDate?: string,
  endDate?: string,
  fallbackLabel?: string
): string {
  const s = (startDate || '').trim()
  const e = (endDate || '').trim()
  if (s && e) return `${formatSingleDate(s)} – ${formatSingleDate(e)}`
  if (s) return `Starts ${formatSingleDate(s)}`
  if (e) return `Ends ${formatSingleDate(e)}`
  return fallbackLabel || DEFAULT_CONTEST_CONFIG.deadline_label
}

let inMemoryContestConfig: ContestConfig = { ...DEFAULT_CONTEST_CONFIG }
let inMemoryContestEntries: ContestEntry[] = []
let lastContestDbError: string | null = null
let lastContestEntriesDbError: string | null = null

export function getContestDbError(): string | null {
  return lastContestDbError
}

export function getContestEntriesDbError(): string | null {
  return lastContestEntriesDbError
}

function parseJsonList<T>(raw: unknown, fallback: T[]): T[] {
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

export function mapContestRow(row: any): ContestConfig {
  if (!row || typeof row !== 'object') {
    return { ...DEFAULT_CONTEST_CONFIG }
  }
  return {
    id: row.id || 'active-contest',
    is_active: row.is_active !== false,
    badge_text: row.badge_text || DEFAULT_CONTEST_CONFIG.badge_text,
    hero_pill_text: row.hero_pill_text || DEFAULT_CONTEST_CONFIG.hero_pill_text,
    title: row.title || DEFAULT_CONTEST_CONFIG.title,
    subtitle: row.subtitle ?? DEFAULT_CONTEST_CONFIG.subtitle,
    topic: row.topic ?? DEFAULT_CONTEST_CONFIG.topic,
    gmeet_url: row.gmeet_url ?? DEFAULT_CONTEST_CONFIG.gmeet_url,
    start_date: row.start_date ?? DEFAULT_CONTEST_CONFIG.start_date,
    end_date: row.end_date ?? DEFAULT_CONTEST_CONFIG.end_date,
    description: row.description ?? DEFAULT_CONTEST_CONFIG.description,
    deadline_label: row.deadline_label || DEFAULT_CONTEST_CONFIG.deadline_label,
    entry_fee_label: row.entry_fee_label || DEFAULT_CONTEST_CONFIG.entry_fee_label,
    show_prizes: row.show_prizes !== false,
    show_steps: row.show_steps !== false,
    prizes: parseJsonList<ContestPrizeItem>(row.prizes, DEFAULT_CONTEST_PRIZES),
    steps: parseJsonList<ContestStepItem>(row.steps, DEFAULT_CONTEST_STEPS),
    rules: parseJsonList<string>(row.rules, DEFAULT_CONTEST_RULES),
    updated_at: row.updated_at,
  }
}

function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  return err?.code === 'PGRST204' || err?.code === '42703' || msg.includes('column')
}

export async function getContestConfig(): Promise<ApiResponse<ContestConfig>> {
  return executeQuery(async () => {
    let { data, error } = await supabase
      .from('contest_config')
      .select(FULL_CONTEST_COLUMNS)
      .eq('id', 'active-contest')
      .maybeSingle()

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('contest_config')
        .select(LEGACY_CONTEST_COLUMNS)
        .eq('id', 'active-contest')
        .maybeSingle()
      if (!fallback.error) {
        data = fallback.data as any
        error = null
        lastContestDbError =
          'New Contest columns (topic, gmeet_url, start_date, end_date, show_prizes, show_steps) are missing in Supabase. Re-run supabase/schema.sql to persist them.'
      } else {
        error = fallback.error
      }
    } else if (!error) {
      lastContestDbError = null
    }

    if (error) {
      lastContestDbError =
        error.message || 'Unable to reach public.contest_config table in Supabase.'
      return { data: inMemoryContestConfig, error: null }
    }

    if (data) {
      const mapped = mapContestRow(data)
      inMemoryContestConfig = mapped
      return { data: mapped, error: null }
    }

    const { data: seeded, error: seedError } = await supabase
      .from('contest_config')
      .upsert(DEFAULT_CONTEST_CONFIG)
      .select(FULL_CONTEST_COLUMNS)
      .single()

    if (!seedError && seeded) {
      const mapped = mapContestRow(seeded)
      inMemoryContestConfig = mapped
      return { data: mapped, error: null }
    }

    return { data: inMemoryContestConfig, error: null }
  }, inMemoryContestConfig)
}

export async function updateContestConfig(
  updates: UpdateContestConfigInput
): Promise<ApiResponse<ContestConfig>> {
  const existing = inMemoryContestConfig
  const updatedRecord: ContestConfig = {
    ...existing,
    is_active: updates.is_active !== undefined ? Boolean(updates.is_active) : existing.is_active,
    badge_text: updates.badge_text !== undefined ? updates.badge_text.trim() : existing.badge_text,
    hero_pill_text:
      updates.hero_pill_text !== undefined ? updates.hero_pill_text.trim() : existing.hero_pill_text,
    title: updates.title !== undefined && updates.title.trim() ? updates.title.trim() : existing.title,
    subtitle: updates.subtitle !== undefined ? updates.subtitle.trim() : existing.subtitle,
    topic: updates.topic !== undefined ? updates.topic.trim() : existing.topic,
    gmeet_url: updates.gmeet_url !== undefined ? updates.gmeet_url.trim() : existing.gmeet_url,
    start_date: updates.start_date !== undefined ? updates.start_date.trim() : existing.start_date,
    end_date: updates.end_date !== undefined ? updates.end_date.trim() : existing.end_date,
    description: updates.description !== undefined ? updates.description.trim() : existing.description,
    deadline_label:
      updates.deadline_label !== undefined ? updates.deadline_label.trim() : existing.deadline_label,
    entry_fee_label:
      updates.entry_fee_label !== undefined
        ? updates.entry_fee_label.trim()
        : existing.entry_fee_label,
    show_prizes: updates.show_prizes !== undefined ? Boolean(updates.show_prizes) : existing.show_prizes,
    show_steps: updates.show_steps !== undefined ? Boolean(updates.show_steps) : existing.show_steps,
    prizes: updates.prizes !== undefined ? updates.prizes : existing.prizes,
    steps: updates.steps !== undefined ? updates.steps : existing.steps,
    rules: updates.rules !== undefined ? updates.rules : existing.rules,
    updated_at: new Date().toISOString(),
  }

  const corePayload = {
    id: 'active-contest',
    is_active: updatedRecord.is_active,
    badge_text: updatedRecord.badge_text,
    hero_pill_text: updatedRecord.hero_pill_text,
    title: updatedRecord.title,
    subtitle: updatedRecord.subtitle,
    description: updatedRecord.description,
    deadline_label: updatedRecord.deadline_label,
    entry_fee_label: updatedRecord.entry_fee_label,
    prizes: updatedRecord.prizes,
    steps: updatedRecord.steps,
    rules: updatedRecord.rules,
    updated_at: updatedRecord.updated_at,
  }

  const fullPayload = {
    ...corePayload,
    topic: updatedRecord.topic,
    gmeet_url: updatedRecord.gmeet_url,
    start_date: updatedRecord.start_date,
    end_date: updatedRecord.end_date,
    show_prizes: updatedRecord.show_prizes,
    show_steps: updatedRecord.show_steps,
  }

  const res = await executeQuery(async () => {
    let { data, error } = await supabase
      .from('contest_config')
      .upsert(fullPayload)
      .select(FULL_CONTEST_COLUMNS)
      .single()

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('contest_config')
        .upsert(corePayload)
        .select(LEGACY_CONTEST_COLUMNS)
        .single()
      if (!fallback.error && fallback.data) {
        lastContestDbError =
          'Contest columns (topic, gmeet_url, start_date, end_date, show_prizes, show_steps) are missing in Supabase. Re-run supabase/schema.sql to save them permanently.'
        const mapped = {
          ...updatedRecord,
          ...mapContestRow(fallback.data),
          topic: updatedRecord.topic,
          gmeet_url: updatedRecord.gmeet_url,
          start_date: updatedRecord.start_date,
          end_date: updatedRecord.end_date,
          show_prizes: updatedRecord.show_prizes,
          show_steps: updatedRecord.show_steps,
        }
        inMemoryContestConfig = mapped
        return { data: mapped, error: null }
      }
      error = fallback.error || error
    }

    if (error) {
      lastContestDbError = error.message || 'Failed to save contest settings to Supabase.'
      return { data: null, error }
    }

    lastContestDbError = null
    if (data) {
      const mapped = mapContestRow(data)
      inMemoryContestConfig = mapped
      return { data: mapped, error: null }
    }

    inMemoryContestConfig = updatedRecord
    return { data: updatedRecord, error: null }
  }, updatedRecord)

  if (res.success && res.data) {
    inMemoryContestConfig = res.data
  }

  return res
}

export async function getContestEntries(): Promise<ApiResponse<ContestEntry[]>> {
  return executeQuery(async () => {
    const { data, error } = await supabase
      .from('contest_entries')
      .select('id,created_at,name,email,phone,category,city_or_role,notes,status')
      .order('created_at', { ascending: false })
      .limit(250)

    if (error) {
      lastContestEntriesDbError =
        error.message || 'Unable to reach public.contest_entries table in Supabase.'
      return { data: inMemoryContestEntries, error: null }
    }

    lastContestEntriesDbError = null
    const items = (data || []) as ContestEntry[]
    inMemoryContestEntries = items
    return { data: items, error: null }
  }, inMemoryContestEntries)
}

export async function submitContestEntry(
  input: CreateContestEntryInput
): Promise<ApiResponse<ContestEntry>> {
  const newEntry: ContestEntry = {
    id: `contest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    category: input.category.trim(),
    city_or_role: input.city_or_role?.trim() || null,
    notes: input.notes?.trim() || null,
    status: 'registered',
  }

  const res = await executeQuery(async () => {
    const { data, error } = await supabase
      .from('contest_entries')
      .insert({
        name: newEntry.name,
        email: newEntry.email,
        phone: newEntry.phone,
        category: newEntry.category,
        city_or_role: newEntry.city_or_role,
        notes: newEntry.notes,
        status: 'registered',
      })
      .select('id,created_at,name,email,phone,category,city_or_role,notes,status')
      .single()

    if (error) {
      lastContestEntriesDbError =
        error.message || 'Could not save entry to public.contest_entries.'
      // Fallback: also capture in leads if contest_entries table hasn't been created yet
      await supabase.from('leads').insert({
        name: newEntry.name,
        email: newEntry.email,
        phone: newEntry.phone,
        source: 'contest',
        status: 'new',
        course_interest: `Contest: ${newEntry.category}`,
        notes: [newEntry.city_or_role, newEntry.notes].filter(Boolean).join(' — '),
      })
      inMemoryContestEntries = [newEntry, ...inMemoryContestEntries]
      return { data: newEntry, error: null }
    }

    lastContestEntriesDbError = null
    const inserted = data as ContestEntry
    inMemoryContestEntries = [inserted, ...inMemoryContestEntries]
    return { data: inserted, error: null }
  }, newEntry)

  return res
}

export async function deleteContestEntry(id: string): Promise<ApiResponse<boolean>> {
  inMemoryContestEntries = inMemoryContestEntries.filter(e => e.id !== id)
  return executeQuery(async () => {
    const { error } = await supabase.from('contest_entries').delete().eq('id', id)
    if (error) return { data: false, error }
    return { data: true, error: null }
  }, true)
}
