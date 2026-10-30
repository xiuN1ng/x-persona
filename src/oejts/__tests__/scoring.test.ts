import { describe, it, expect } from 'vitest'
import { scoreOejts, comparePersonas } from '../scoring'
import type { AxisScores } from '../../persona/axes'

describe('OEJTS 1.2 Scoring Algorithm', () => {
  it('correctly calculates midpoint (all answers = 3)', () => {
    // Fill all 32 questions with neutral 3
    const answers: Record<number, number> = {}
    for (let i = 1; i <= 32; i++) answers[i] = 3

    const result = scoreOejts(answers)

    // Check raw scores:
    // IE = 30 - 3 - 3 - 3 + 3 - 3 + 3 + 3 - 3 = 24
    // SN = 12 + 3 + 3 + 3 + 3 + 3 - 3 - 3 + 3 = 24
    // FT = 30 - 3 + 3 + 3 - 3 - 3 + 3 - 3 - 3 = 24
    // JP = 18 + 3 + 3 - 3 + 3 - 3 + 3 - 3 + 3 = 24
    expect(result.ieRaw).toBe(24)
    expect(result.snRaw).toBe(24)
    expect(result.ftRaw).toBe(24)
    expect(result.jpRaw).toBe(24)

    // Cutoff > 24 for E/N/T/P, <= 24 for I/S/F/J
    expect(result.type).toBe('ISFJ')
    expect(result.ieNormalized).toBe(50)
    expect(result.snNormalized).toBe(50)
    expect(result.ftNormalized).toBe(50)
    expect(result.jpNormalized).toBe(50)
  })

  it('correctly calculates extreme E-N-T-P (> 24 on all dimensions)', () => {
    // Create an answer pattern that maximizes IE, SN, FT, JP
    const answers: Record<number, number> = {}
    for (let i = 1; i <= 32; i++) {
      // IE questions: 3, 7, 11, 15, 19, 23, 27, 31
      // + terms: 15, 23, 27 -> set to 5
      // - terms: 3, 7, 11, 19, 31 -> set to 1
      if ([15, 23, 27].includes(i)) answers[i] = 5
      else if ([3, 7, 11, 19, 31].includes(i)) answers[i] = 1

      // SN questions: 4, 8, 12, 16, 20, 24, 28, 32
      // + terms: 4, 8, 12, 16, 20, 32 -> set to 5
      // - terms: 24, 28 -> set to 1
      else if ([4, 8, 12, 16, 20, 32].includes(i)) answers[i] = 5
      else if ([24, 28].includes(i)) answers[i] = 1

      // FT questions: 2, 6, 10, 14, 18, 22, 26, 30
      // + terms: 6, 10, 22 -> set to 5
      // - terms: 2, 14, 18, 26, 30 -> set to 1
      else if ([6, 10, 22].includes(i)) answers[i] = 5
      else if ([2, 14, 18, 26, 30].includes(i)) answers[i] = 1

      // JP questions: 1, 5, 9, 13, 17, 21, 25, 29
      // + terms: 1, 5, 13, 21, 29 -> set to 5
      // - terms: 9, 17, 25 -> set to 1
      else if ([1, 5, 13, 21, 29].includes(i)) answers[i] = 5
      else if ([9, 17, 25].includes(i)) answers[i] = 1
      else answers[i] = 3
    }

    const result = scoreOejts(answers)
    expect(result.ieRaw).toBeGreaterThan(24)
    expect(result.snRaw).toBeGreaterThan(24)
    expect(result.ftRaw).toBeGreaterThan(24)
    expect(result.jpRaw).toBeGreaterThan(24)
    expect(result.type).toBe('ENTP')
  })

  it('calculates dual-perspective consistency index', () => {
    const tweetAxes: AxisScores = {
      field: 50,
      density: 50,
      temperature: 50,
      rhythm: 50,
    }

    // Midpoint OEJTS gives normalized 50 across all axes
    const answers: Record<number, number> = {}
    for (let i = 1; i <= 32; i++) answers[i] = 3
    const oejts = scoreOejts(answers)

    const comparison = comparePersonas(tweetAxes, oejts, 'CSFD')
    expect(comparison.consistencyIndex).toBe(100)
    expect(comparison.summaryZh).toContain('知行合一')
  })
})
