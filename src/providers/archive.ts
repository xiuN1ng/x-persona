import type { Post } from './types'

export function parseTweetsJsContent(rawText: string): Post[] {
  // Strip potential window.YTD.tweets.part0 = ... assignment
  let jsonString = rawText.trim()
  if (jsonString.startsWith('window.YTD.tweets')) {
    const eqIdx = jsonString.indexOf('=')
    if (eqIdx !== -1) {
      jsonString = jsonString.substring(eqIdx + 1).trim()
    }
  }

  // Parse JSON
  let rawItems: any[] = []
  try {
    rawItems = JSON.parse(jsonString)
  } catch (err) {
    throw new Error('Failed to parse tweets data. Ensure it is a valid tweets.js or JSON file.')
  }

  if (!Array.isArray(rawItems)) {
    throw new Error('Expected an array of tweets in archive data.')
  }

  const posts: Post[] = []

  for (const item of rawItems) {
    const tweet = item.tweet || item
    if (!tweet || !tweet.id_str) continue

    const text = tweet.full_text || tweet.text || ''
    const isReply = Boolean(tweet.in_reply_to_status_id_str || tweet.in_reply_to_screen_name)
    const replyToHandle = tweet.in_reply_to_screen_name || null
    const isRetweet = text.startsWith('RT @')
    const isQuote = Boolean(tweet.is_quote_status)

    const hashtags: string[] = []
    if (tweet.entities?.hashtags) {
      for (const h of tweet.entities.hashtags) {
        if (h.text) hashtags.push(h.text)
      }
    }

    const mentions: string[] = []
    if (tweet.entities?.user_mentions) {
      for (const m of tweet.entities.user_mentions) {
        if (m.screen_name) mentions.push(m.screen_name)
      }
    }

    const hasMedia = Boolean(
      (tweet.extended_entities?.media && tweet.extended_entities.media.length > 0) ||
      (tweet.entities?.media && tweet.entities.media.length > 0)
    )

    const hasLink = Boolean(
      tweet.entities?.urls && tweet.entities.urls.length > 0
    )

    const createdTimestamp = tweet.created_at ? Math.floor(new Date(tweet.created_at).getTime() / 1000) : 0

    posts.push({
      id: tweet.id_str,
      createdAt: tweet.created_at || new Date().toISOString(),
      createdTimestamp,
      text,
      lang: tweet.lang || null,
      isReply,
      isRetweet,
      isQuote,
      replyToHandle,
      likes: parseInt(tweet.favorite_count || '0', 10),
      reposts: parseInt(tweet.retweet_count || '0', 10),
      replies: 0,
      views: 0,
      hasMedia,
      hasLink,
      hashtags,
      mentions,
    })
  }

  return posts
}
