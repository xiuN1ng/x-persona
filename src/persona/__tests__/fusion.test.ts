import { describe, it, expect } from 'vitest'
import { fusePersonas } from '../fusion-engine'
import { determineArchetype } from '../axes'
import { scoreOejts, comparePersonas } from '../../oejts/scoring'
import { computeProceduralCardStyle } from '../../ui/components/ProceduralArt'
import { computeGenerativeDNA } from '../../ui/components/GenerativeCanvas'

describe('Dual-World Card Fusion & Procedural Style Engine', () => {
  it('deterministically synthesizes Card III (Fusion Card) and 1-of-1 Generative DNA from numeric vectors', () => {
    const outerAxes = { field: 29, density: 37, temperature: 72, rhythm: 85 }
    const outerPersona = determineArchetype(outerAxes) // BEFD

    // Simulate INFP answers
    const answers: Record<number, number> = {}
    for (let i = 1; i <= 32; i++) answers[i] = 3
    answers[4] = 5 // N
    answers[8] = 5 // N
    answers[1] = 5 // P
    answers[5] = 5 // P
    const innerScores = scoreOejts(answers)

    const comparison = comparePersonas(outerPersona.axes, innerScores, outerPersona.code)
    const fusion = fusePersonas(outerPersona, innerScores, comparison)

    expect(fusion.fusionCode).toBe(`${outerPersona.code}×${innerScores.type}`)
    expect(fusion.titleZh).toBeTruthy()
    expect(fusion.passiveNameZh).toContain('【')
    expect(fusion.passiveDescZh.length).toBeGreaterThan(10)

    // Verify procedural style is 100% deterministic for each of the 3 cards
    const style1 = computeProceduralCardStyle('outer', outerPersona.code, outerAxes, 'coldmountainlab')
    const style1Repeat = computeProceduralCardStyle('outer', outerPersona.code, outerAxes, 'coldmountainlab')
    const style2 = computeProceduralCardStyle('inner', innerScores.type, fusion.innerAxesAsOuterScale, 'coldmountainlab')
    const style3 = computeProceduralCardStyle('fusion', fusion.fusionCode, fusion.fusedAxes, 'coldmountainlab')

    expect(style1).toEqual(style1Repeat)
    expect(style1.bgGradientCss).not.toEqual(style2.bgGradientCss)
    expect(style3.bgGradientCss).not.toEqual(style1.bgGradientCss)

    // Verify Chladni & Spirograph Generative DNA produces unique mathematical signatures per numeric change
    const dna1 = computeGenerativeDNA('outer', outerPersona.code, outerAxes, 'coldmountainlab')
    const dna2 = computeGenerativeDNA('outer', outerPersona.code, { ...outerAxes, density: 88, temperature: 19 }, 'coldmountainlab')
    const dna3 = computeGenerativeDNA('fusion', fusion.fusionCode, fusion.fusedAxes, 'coldmountainlab', [29, 37, 72, 85, 62, 74, 68, 70])

    expect(dna1.seed).not.toEqual(dna2.seed)
    expect(dna1.chladniM).not.toEqual(dna2.chladniM)
    expect(dna1.hypotrochoidr).not.toEqual(dna2.hypotrochoidr)
    expect(dna3.seed).toBeGreaterThan(0)
  })
})
