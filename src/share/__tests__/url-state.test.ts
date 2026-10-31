import { describe, it, expect } from 'vitest'
import {
  encodeShareState,
  decodeShareState,
  buildShareUrl,
  buildTweetIntentUrl,
  OPEN_SOURCE_PAGE_URL,
  type ShareState
} from '../url-state'

describe('URL Hash Share State & Open-Source Pages Link', () => {
  it('round-trips state cleanly with LZString compression and carries public Pages URL', () => {
    const originalState: ShareState = {
      version: 1,
      profile: {
        screenName: 'coldmountainlab',
        name: 'Cold Mountain',
        avatarUrl: 'https://pbs.twimg.com/avatar.jpg',
        followers: 700,
        statusesCount: 1100,
      },
      axes: {
        field: 65,
        density: 45,
        temperature: 55,
        rhythm: 70,
      },
      archetypeCode: 'CEFD',
      oejts: {
        type: 'ENFP',
        consistencyIndex: 88,
      },
    }

    const encoded = encodeShareState(originalState)
    expect(encoded).toBeTruthy()
    expect(encoded.length).toBeLessThan(500) // highly compressed

    const decoded = decodeShareState(encoded)
    expect(decoded).toEqual(originalState)

    const shareUrl = buildShareUrl(originalState)
    expect(shareUrl).toContain(OPEN_SOURCE_PAGE_URL)
    expect(shareUrl).toContain('#r=')

    const intentUrl = buildTweetIntentUrl(`测卡地址：${OPEN_SOURCE_PAGE_URL}`, shareUrl)
    expect(intentUrl).toContain('https://x.com/intent/post')
    expect(intentUrl).toContain(encodeURIComponent(OPEN_SOURCE_PAGE_URL))
  })
})
