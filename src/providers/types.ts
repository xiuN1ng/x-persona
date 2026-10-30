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

export interface AvatarVisualFeatures {
  dominantColorHex: string;
  secondaryColorHex: string;
  accentColorHex: string;
  dominantHue: number;      // 0 - 360
  secondaryHue: number;     // 0 - 360
  luminance: number;        // 0 - 100 (0 = dark, 100 = bright)
  saturation: number;       // 0 - 100
  warmth: number;           // 0 - 100 (>50 warm, <50 cool)
  contrast: number;         // 0 - 100
  detailDensity: number;    // 0 - 100 (edge gradient complexity)
  perceptualHash: number;   // 32-bit unsigned int from 8x8 color grid
  paletteSwatches: string[]; // 4 hex swatches extracted from avatar
  isExtractedFromPixels: boolean;
}

export interface Profile {
  screenName: string;
  name: string;
  description: string;
  avatarUrl: string;
  rawAvatarUrl?: string;
  avatarFeatures?: AvatarVisualFeatures;
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
