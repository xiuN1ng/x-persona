import type { DataProvider, FetchTimelineOptions, Post, Profile } from './types'
import { upgradeTwitterAvatarUrl } from './avatar'

interface FxUserResponse {
  code: number;
  message?: string;
  user: {
    screen_name: string;
    name: string;
    description?: string;
    avatar_url?: string;
    banner_url?: string;
    followers?: number;
    following?: number;
    statuses?: number;
    likes?: number;
    joined?: string;
    verification?: {
      verified?: boolean;
    };
  };
}

interface FxStatusItem {
  id: string;
  text: string;
  created_at: string;
  created_timestamp: number;
  views?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  quotes?: number;
  lang?: string | null;
  replying_to?: {
    screen_name: string;
    status?: string;
  } | null;
  reposted_by?: {
    screen_name: string;
  } | null;
  raw_text?: {
    facets?: Array<{
      type: string;
      original: string;
    }>;
  };
  media?: {
    all?: unknown[];
    photos?: unknown[];
    videos?: unknown[];
  };
}

interface FxStatusesResponse {
  code: number;
  message?: string;
  results?: FxStatusItem[];
  cursor?: {
    bottom?: string;
    top?: string;
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class FxTwitterProvider implements DataProvider {
  id = 'fxtwitter' as const
  name = 'FxTwitter (Public Gateway)'
  baseUrl = 'https://api.fxtwitter.com'

  constructor(customBaseUrl?: string) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl.replace(/\/+$/, '')
    }
  }

  private cleanHandle(handle: string): string {
    return handle.trim().replace(/^@+/, '')
  }

  async fetchProfile(handle: string): Promise<Profile> {
    const screenName = this.cleanHandle(handle)
    if (!screenName) {
      throw new Error('Username cannot be empty')
    }

    const res = await fetch(`${this.baseUrl}/2/profile/${screenName}`, {
      headers: {
        'User-Agent': 'xpersona/0.1.0',
      },
    })

    if (res.status === 404) {
      throw new Error(`User @${screenName} not found or account is suspended`)
    }
    if (res.status === 429) {
      throw new Error('FxTwitter rate limit hit. Please try again shortly or switch provider.')
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch profile: HTTP ${res.status}`)
    }

    const data: FxUserResponse = await res.json()
    if (data.code !== 200 || !data.user) {
      throw new Error(data.message || 'Invalid user data received')
    }

    const u = data.user
    const rawAvatarUrl = u.avatar_url || ''
    return {
      screenName: u.screen_name,
      name: u.name,
      description: u.description || '',
      avatarUrl: upgradeTwitterAvatarUrl(rawAvatarUrl),
      rawAvatarUrl,
      bannerUrl: u.banner_url || '',
      followers: u.followers || 0,
      following: u.following || 0,
      statusesCount: u.statuses || 0,
      likesCount: u.likes || 0,
      joinedDate: u.joined,
      verified: Boolean(u.verification?.verified),
    }
  }

  async fetchTimeline(handle: string, opts: FetchTimelineOptions): Promise<Post[]> {
    const screenName = this.cleanHandle(handle)
    const targetMax = Math.min(Math.max(opts.max || 150, 20), 400)
    const allPosts: Post[] = []
    let cursor: string | null = null
    const seenIds = new Set<string>()

    while (allPosts.length < targetMax) {
      let url = `${this.baseUrl}/2/profile/${screenName}/statuses`
      if (cursor) {
        url += `?cursor=${encodeURIComponent(cursor)}`
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'xpersona/0.1.0',
        },
      })

      if (res.status === 429) {
        if (allPosts.length > 30) {
          // If we already have a reasonable sample, gracefully return
          console.warn('[FxTwitter] 429 rate limit reached during pagination; returning gathered posts.')
          break
        }
        throw new Error('Rate limit reached on public gateway. Please try again in 1 minute.')
      }

      if (!res.ok) {
        if (allPosts.length > 0) break
        throw new Error(`Failed to fetch timeline: HTTP ${res.status}`)
      }

      const data: FxStatusesResponse = await res.json()
      const results = data.results || []
      if (results.length === 0) {
        break
      }

      for (const item of results) {
        if (seenIds.has(item.id)) continue
        seenIds.add(item.id)

        const isReply = Boolean(item.replying_to)
        if (!opts.includeReplies && isReply) {
          continue
        }

        const isRetweet = Boolean(item.reposted_by)
        const isQuote = (item.quotes || 0) > 0

        // Extract hashtags from raw_text facets or text
        const hashtags: string[] = []
        if (item.raw_text?.facets) {
          for (const facet of item.raw_text.facets) {
            if (facet.type === 'hashtag' && facet.original) {
              hashtags.push(facet.original.replace(/^#/, ''))
            }
          }
        }
        if (hashtags.length === 0 && item.text) {
          const matched = item.text.match(/#([\p{L}\p{N}_]+)/gu)
          if (matched) {
            hashtags.push(...matched.map(h => h.replace(/^#/, '')))
          }
        }

        // Extract mentions
        const mentions: string[] = []
        const mentionMatches = item.text?.match(/@([a-zA-Z0-9_]{1,15})/g)
        if (mentionMatches) {
          mentions.push(...mentionMatches.map(m => m.replace(/^@/, '')))
        }

        const hasMedia = Boolean(
          item.media &&
          ((item.media.all && item.media.all.length > 0) ||
           (item.media.photos && item.media.photos.length > 0) ||
           (item.media.videos && item.media.videos.length > 0))
        )

        allPosts.push({
          id: item.id,
          createdAt: item.created_at,
          createdTimestamp: item.created_timestamp,
          text: item.text || '',
          lang: item.lang,
          isReply,
          isRetweet,
          isQuote,
          replyToHandle: item.replying_to?.screen_name || null,
          likes: item.likes || 0,
          reposts: item.reposts || 0,
          replies: item.replies || 0,
          views: item.views || 0,
          hasMedia,
          hasLink: Boolean(item.text && item.text.includes('http')),
          hashtags,
          mentions,
        })

        if (allPosts.length >= targetMax) break
      }

      opts.onProgress?.(allPosts.length, targetMax)

      const nextCursor = data.cursor?.bottom
      if (!nextCursor || nextCursor === cursor) {
        break
      }
      cursor = nextCursor

      // Gentle pause between requests
      await sleep(150)
    }

    return allPosts
  }
}
