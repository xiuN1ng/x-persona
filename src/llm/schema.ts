import { z } from 'zod'

export const PersonaLlmOutputSchema = z.object({
  archetype: z.string().length(4).regex(/^[BC][ES][AF][KD]$/),
  axis: z.object({
    field: z.number().min(0).max(100),
    density: z.number().min(0).max(100),
    temperature: z.number().min(0).max(100),
    rhythm: z.number().min(0).max(100),
  }),
  roast: z.string().min(10).max(300),
  portrait: z.string().min(20).max(800),
  strengths: z.array(z.string()).min(2).max(5),
  redFlags: z.array(z.string()).min(2).max(5),
  spiritAnimal: z.object({
    name: z.string(),
    reason: z.string(),
  }),
  bestMatch: z.string(),
  prediction2027: z.string(),
  mbtiGuess: z.object({
    type: z.string().regex(/^[IE][SN][TF][JP]$/),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()).min(1),
  }),
})

export type PersonaLlmOutput = z.infer<typeof PersonaLlmOutputSchema>
