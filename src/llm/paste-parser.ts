import { PersonaLlmOutputSchema, type PersonaLlmOutput } from './schema'

export interface ParseResult {
  success: boolean;
  data?: PersonaLlmOutput;
  error?: string;
  fixSuggestion?: string;
}

export function parseLlmPastedText(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      error: 'Pasted text is empty.',
    }
  }

  let text = rawText.trim()

  // 1. Extract JSON from markdown code block if present
  const markdownBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (markdownBlockMatch) {
    text = markdownBlockMatch[1].trim()
  } else {
    // Or find first '{' and last '}'
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim()
    }
  }

  // 2. Clean typical LLM JSON quirks (e.g., trailing commas)
  text = text.replace(/,\s*([}\]])/g, '$1')

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(text)
  } catch (err: any) {
    return {
      success: false,
      error: `JSON syntax error: ${err.message || 'Failed to parse JSON'}`,
      fixSuggestion: 'Please ensure you copied the complete JSON block from the LLM, starting with { and ending with }.',
    }
  }

  // 3. Validate against Zod schema
  const validation = PersonaLlmOutputSchema.safeParse(parsedJson)
  if (!validation.success) {
    const issues = validation.error.issues
      .map(i => `Field "${i.path.join('.')}" : ${i.message}`)
      .join('; ')
    return {
      success: false,
      error: `JSON structure validation failed: ${issues}`,
      fixSuggestion: 'Some required fields were missing or had invalid types. You can ask your LLM: "Please re-format the previous output strictly as valid JSON following the schema."',
    }
  }

  return {
    success: true,
    data: validation.data,
  }
}
