import { describe, it, expect } from 'vitest'
import { encodeShareState, decodeShareState, type ShareState } from '../url-state'

describe('URL Hash Share State', () => {
  it('round-trips state cleanly with LZString compression', () => {
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
  })
})
