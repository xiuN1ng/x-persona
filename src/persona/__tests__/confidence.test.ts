import { describe, it, expect } from 'vitest'
import { computePersonaConfidence } from '../confidence'

const axes = (f: number, d: number, t: number, r: number) => ({
  field: f,
  density: d,
  temperature: t,
  rhythm: r,
})

describe('computePersonaConfidence', () => {
  it('is low for tiny samples', () => {
    const c = computePersonaConfidence({ analyzedPostCount: 12 }, axes(20, 80, 20, 80))
    expect(c.level).toBe('low')
    expect(c.messageZh).toContain('12')
  })

  it('is high for large clear samples', () => {
    const c = computePersonaConfidence({ analyzedPostCount: 200 }, axes(10, 90, 15, 85))
    expect(c.level).toBe('high')
    expect(c.borderlineAxes).toEqual([])
  })

  it('flags borderline axes and caps confidence when several are near 50', () => {
    const c = computePersonaConfidence({ analyzedPostCount: 200 }, axes(52, 48, 10, 90))
    expect(c.borderlineAxes).toEqual(['field', 'density'])
    expect(c.level).toBe('medium')
  })
})
