export interface Post {
  id: string;
  createdAt: string;
  createdTimestamp: number;
  text: string;
  lang?: string | null;
  isReply: boolean;
  isRetweet: boolean;
  isQuote: boolean;
  replyToHandle?: string | null;
  likes: number;
  reposts: number;
  replies: number;
  views: number;
  hasMedia: boolean;
  hasLink: boolean;
  hashtags: string[];
  mentions: string[];
}

export interface Profile {
  screenName: string;
  name: string;
  description: string;
  avatarUrl: string;
  bannerUrl?: string;
  followers: number;
  following: number;
  statusesCount: number;
  likesCount: number;
  joinedDate?: string;
  verified: boolean;
}

export interface FetchTimelineOptions {
  max: number;
  includeReplies: boolean;
  onProgress?: (fetchedCount: number, targetCount: number) => void;
}

export interface DataProvider {
  id: 'fxtwitter' | 'proxy' | 'twitterapi' | 'xapi' | 'archive';
  name: string;
  fetchProfile(handle: string): Promise<Profile>;
  fetchTimeline(handle: string, opts: FetchTimelineOptions): Promise<Post[]>;
}
