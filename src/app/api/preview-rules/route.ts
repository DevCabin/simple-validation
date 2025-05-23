import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure OPENAI_API_KEY is loaded from environment variables
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface RuleFeedback {
  originalRule: string;
  interpretation: string;
  status: 'recognized' | 'unrecognized' | 'error';
}

// This function provides a basic interpretation of rules based on existing patterns.
// For a real NLP solution, this would involve calls to an LLM.
function getRuleInterpretation(rule: string): Omit<RuleFeedback, 'originalRule'> {
  const lowerRule = rule.toLowerCase();

  if (rule === 'Must not contain uploaded forbidden words') {
    return { interpretation: 'Checks against the uploaded forbidden words list.', status: 'recognized' };
  }
  if (lowerRule.includes('name') && (lowerRule.includes('capitalized') || lowerRule.includes('capital'))) {
    return { interpretation: 'Checks for capitalized names (e.g., John Doe).', status: 'recognized' };
  }
  if ((lowerRule.includes('ssn') || lowerRule.includes('social security')) && lowerRule.includes('blank')) {
    return { interpretation: 'Checks for the presence of Social Security Numbers (XXX-XX-XXXX).', status: 'recognized' };
  }
  if (lowerRule.includes('email') && (lowerRule.includes('valid') || lowerRule.includes('format'))) {
    return { interpretation: 'Checks for valid email address formats.', status: 'recognized' };
  }
  if (lowerRule.includes('phone') && (lowerRule.includes('valid') || lowerRule.includes('format'))) {
    return { interpretation: 'Checks for valid US-style phone number formats.', status: 'recognized' };
  }
  // Regex for: must contain "word1" and "word2" but not "word3"
  const andButNotPattern = /must contain\s+("?)([^"\s]+)\1\s+and\s+("?)([^"\s]+)\3\s+but not\s+("?)([^"\s]+)\5/i;
  let match = rule.match(andButNotPattern);
  if (match) {
    return { interpretation: `Requires presence of "${match[2]}" AND "${match[4]}", AND absence of "${match[6]}".`, status: 'recognized' };
  }

  // Regex for: must contain the word "word1"
  const specificWordPattern = /must contain the word\s+("?)([^"\s]+)\1/i;
  match = rule.match(specificWordPattern);
  if (match) {
    return { interpretation: `Requires the document to contain the word: "${match[2]}".`, status: 'recognized' };
  }
  
  // Regex for: must NOT contain the word "word1"
  const specificWordNotPattern = /(?:must not|cannot|should not) contain(?: the word)?\s+("?)([^"\s]+)\1/i;
  match = rule.match(specificWordNotPattern);
  if (match) {
    return { interpretation: `Ensures the document does NOT contain the word/phrase: "${match[2]}".`, status: 'recognized' };
  }
  
  // Generic "must contain" with ALL CAPS words
  if (lowerRule.includes('must contain')) {
    const capsWords = rule.match(/\b[A-Z]{2,}\b/g);
    if (capsWords && capsWords.length > 0) {
      return { interpretation: `Checks for the presence of the ALL CAPS words: ${capsWords.join(', ')}.`, status: 'recognized' };
    }
    // If "must contain" is present but no specific sub-patterns match, provide a slightly more generic recognized message.
    return { interpretation: 'General check for required words/phrases.', status: 'recognized' };
  }

  return {
    interpretation: 'This rule does not match any known patterns. It may be evaluated by future NLP capabilities or will be marked as unrecognized by current logic.',
    status: 'unrecognized',
  };
}

async function getOpenAIInterpretation(rule: string): Promise<Omit<RuleFeedback, 'originalRule'> | null> {
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an assistant that helps understand document validation rules. Concisely rephrase the user's rule into its primary validation intent. If a rule is too vague or seems unrelated to document content validation, state that it's \"Ambiguous or not directly verifiable as a document content rule.\"`,
        },
        { role: "user", content: `User rule: "${rule}"` },
      ],
      max_tokens: 60,
      temperature: 0.2,
    });

    const interpretation = completion.choices[0]?.message?.content?.trim();
    if (interpretation) {
      // Simple check if AI considered it ambiguous based on our prompt examples
      if (interpretation.toLowerCase().includes("ambiguous") || interpretation.toLowerCase().includes("not directly verifiable")) {
        return { interpretation, status: 'unrecognized' }; 
      }
      return { interpretation, status: 'recognized' };
    }
    return null; // Should not happen often
  } catch (error) {
    console.error("Error getting OpenAI interpretation:", error);
    return { interpretation: "Error contacting AI for interpretation.", status: 'error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customRulesText = body.customRulesText as string | null;

    if (!customRulesText || customRulesText.trim() === '') {
      return NextResponse.json({ error: 'No custom rules text provided' }, { status: 400 });
    }

    const rules = customRulesText.split('\n').map(rule => rule.trim()).filter(rule => rule.length > 0);
    
    const feedbackPromises: Promise<RuleFeedback>[] = rules.map(async (rule) => {
      let interpretationResult: Omit<RuleFeedback, 'originalRule'> | null = null;
      if (openai) {
        interpretationResult = await getOpenAIInterpretation(rule);
      }
      // Fallback to heuristic if OpenAI is not configured or fails
      if (!interpretationResult) {
        interpretationResult = getRuleInterpretation(rule);
      }
      return {
        originalRule: rule,
        ...interpretationResult,
      };
    });

    const feedback = await Promise.all(feedbackPromises);

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Rule preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during rule preview.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 