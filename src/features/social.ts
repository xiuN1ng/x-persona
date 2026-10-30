import type { Post } from '../providers/types'

export interface SocialFeatures {
  replyTargetHHI: number;
  avgLikes: number;
  avgReposts: number;
  avgReplies: number;
  avgViews: number;
  mostEngagedPost?: {
    id: string;
    text: string;
    likes: number;
    reposts: number;
    views: number;
  };
}

export function extractSocialFeatures(posts: Post[]): SocialFeatures {
  const total = posts.length
  if (total === 0) {
    return {
      replyTargetHHI: 0,
      avgLikes: 0,
      avgReposts: 0,
      avgReplies: 0,
      avgViews: 0,
    }
  }

  let totalLikes = 0
  let totalReposts = 0
  let totalReplies = 0
  let totalViews = 0
  let viewCountedPosts = 0

  const replyTargetCounts = new Map<string, number>()
  let totalRepliesTracked = 0

  let highestScore = -1
  let mostEngagedPost: SocialFeatures['mostEngagedPost'] = undefined

  for (const post of posts) {
    totalLikes += post.likes
    totalReposts += post.reposts
    totalReplies += post.replies

    if (post.views > 0) {
      totalViews += post.views
      viewCountedPosts++
    }

    if (post.isReply && post.replyToHandle) {
      const handle = post.replyToHandle.toLowerCase()
      replyTargetCounts.set(handle, (replyTargetCounts.get(handle) || 0) + 1)
      totalRepliesTracked++
    }

    // Engagement score = likes + reposts * 2 + replies * 2
    const score = post.likes + post.reposts * 2 + post.replies * 2
    if (score > highestScore) {
      highestScore = score
      mostEngagedPost = {
        id: post.id,
        text: post.text,
        likes: post.likes,
        reposts: post.reposts,
        views: post.views,
      }
    }
  }

  // Calculate HHI: sum of (si)^2 where si is proportion of replies to target i
  let replyTargetHHI = 0
  if (totalRepliesTracked > 0) {
    for (const count of replyTargetCounts.values()) {
      const share = count / totalRepliesTracked
      replyTargetHHI += share * share
    }
  }

  return {
    replyTargetHHI: Number(replyTargetHHI.toFixed(3)),
    avgLikes: Math.round(totalLikes / total),
    avgReposts: Math.round(totalReposts / total),
    avgReplies: Math.round(totalReplies / total),
    avgViews: viewCountedPosts > 0 ? Math.round(totalViews / viewCountedPosts) : 0,
    mostEngagedPost,
  }
}
