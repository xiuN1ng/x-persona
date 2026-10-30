import { get, set, del } from 'idb-keyval'
import type { Profile, Post } from './types'

export interface CachedUserData {
  profile: Profile;
  posts: Post[];
  timestamp: number;
}

const CACHE_PREFIX = 'xpersona_data_'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function getCachedUserData(handle: string, ttlMs: number = DEFAULT_TTL_MS): Promise<CachedUserData | null> {
  const key = `${CACHE_PREFIX}${handle.toLowerCase()}`
  try {
    const data = await get<CachedUserData>(key)
    if (!data) return null
    if (Date.now() - data.timestamp > ttlMs) {
      await del(key)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Cache] Failed to read from IndexedDB', err)
    return null
  }
}

export async function setCachedUserData(handle: string, profile: Profile, posts: Post[]): Promise<void> {
  const key = `${CACHE_PREFIX}${handle.toLowerCase()}`
  try {
    await set(key, {
      profile,
      posts,
      timestamp: Date.now()
    })
  } catch (err) {
    console.warn('[Cache] Failed to save to IndexedDB', err)
  }
}

export async function clearCachedUserData(handle: string): Promise<void> {
  const key = `${CACHE_PREFIX}${handle.toLowerCase()}`
  try {
    await del(key)
  } catch (err) {
    console.warn('[Cache] Failed to delete from IndexedDB', err)
  }
}
