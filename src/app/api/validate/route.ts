import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import multer from 'multer';

// Ensure OPENAI_API_KEY is loaded from environment variables
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ValidationResult {
  rule: string;
  passed: boolean;
  details?: string;
}

interface ValidationReport {
  results: ValidationResult[];
  documentText: string;
}

/**
 * Extracts text from uploaded file based on file type
 */
async function extractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to extract text from PDF. Ensure it's a valid PDF file.`);
    }
  } else if (file.type === 'text/plain' || file.name.endsWith('.forbidden') || file.name.endsWith('.ext')) {
    return cleanText(buffer.toString('utf-8'));
  } else {
    throw new Error('Unsupported file type for text extraction');
  }
}

/**
 * Clean extracted text to remove HTML tags and normalize whitespace
 */
function cleanText(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove HTML entities
    .replace(/&[#\w]+;/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches validation rules from GitHub repository via gitmcp.io
 */
async function fetchRules(rulesUrl: string): Promise<string[]> {
  try {
    const response = await fetch(rulesUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch rules: ${response.statusText}`);
    }
    
    const rulesContent = await response.text();
    
    // Parse rules - each line that's not empty and doesn't start with # is a rule
    const rules = rulesContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'))
      .filter(line => line.length > 10); // Basic filter for actual rules
    
    return rules;
  } catch (error) {
    throw new Error(`Failed to fetch validation rules: ${error}`);
  }
}

/**
 * Validates document text against a single rule using basic pattern matching
 */
function validateRule(rule: string, documentText: string, dynamicForbiddenWords: string[] = []): ValidationResult {
  const lowerRule = rule.toLowerCase();
  const lowerText = documentText.toLowerCase();
  
  // Dynamic Forbidden Words Rule
  if (rule === 'Must not contain uploaded forbidden words') {
    if (dynamicForbiddenWords.length === 0) {
      return { rule, passed: true, details: 'No forbidden words list provided or list is empty.' };
    }
    const foundForbidden = dynamicForbiddenWords.filter(word => lowerText.includes(word.toLowerCase()));
    if (foundForbidden.length > 0) {
      return {
        rule,
        passed: false,
        details: `Forbidden words found: ${foundForbidden.join(', ')}`,
      };
    }
    return { rule, passed: true, details: 'No uploaded forbidden words found in the document.' };
  }
  
  // Rule: "Names must be capitalized" / "Name must be capitalized"
  if (lowerRule.includes('name') && (lowerRule.includes('capitalized') || lowerRule.includes('capital'))) {
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const capitalizedNames = documentText.match(namePattern);
    
    if (capitalizedNames && capitalizedNames.length > 0) {
      return {
        rule,
        passed: true,
        details: `Found capitalized names: ${capitalizedNames.slice(0, 3).join(', ')}${capitalizedNames.length > 3 ? '...' : ''}`
      };
    } else {
      return {
        rule,
        passed: false,
        details: 'No capitalized names found in document'
      };
    }
  }
  
  // Rule: "SSN cannot be blank" / "Social Security Number cannot be blank"
  if ((lowerRule.includes('ssn') || lowerRule.includes('social security')) && lowerRule.includes('blank')) {
    const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
    const ssns = documentText.match(ssnPattern);
    
    if (ssns && ssns.length > 0) {
      return {
        rule,
        passed: true,
        details: `Found SSN(s): ${ssns.map(ssn => ssn.replace(/\d/g, '*')).join(', ')}`
      };
    } else {
      return {
        rule,
        passed: false,
        details: 'No SSN found in document'
      };
    }
  }
  
  // Rule: Email address validation
  if (lowerRule.includes('email') && (lowerRule.includes('valid') || lowerRule.includes('format'))) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = documentText.match(emailPattern);
    
    if (emails && emails.length > 0) {
      return {
        rule,
        passed: true,
        details: `Found valid email(s): ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}`
      };
    } else {
      return {
        rule,
        passed: false,
        details: 'No valid email addresses found'
      };
    }
  }
  
  // Rule: Phone number validation
  if (lowerRule.includes('phone') && (lowerRule.includes('valid') || lowerRule.includes('format'))) {
    const phonePattern = /\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phones = documentText.match(phonePattern);
    
    if (phones && phones.length > 0) {
      return {
        rule,
        passed: true,
        details: `Found phone number(s): ${phones.slice(0, 3).join(', ')}${phones.length > 3 ? '...' : ''}`
      };
    } else {
      return {
        rule,
        passed: false,
        details: 'No valid phone numbers found'
      };
    }
  }
  
  // Rule: "Document must contain MUSTARD and MAYO but not KETCHUP"
  if (lowerRule.includes('must contain') && lowerRule.includes('and') && lowerRule.includes('but not')) {
    const andButNotPattern = /must contain.*?(\w+)\s+and\s+(\w+)\s+but\s+not\s+(\w+)/i;
    const match = rule.match(andButNotPattern);
    
    if (match) {
      const [, word1, word2, forbiddenWord] = match;
      const hasWord1 = lowerText.includes(word1.toLowerCase());
      const hasWord2 = lowerText.includes(word2.toLowerCase());
      const hasForbidden = lowerText.includes(forbiddenWord.toLowerCase());
      
      const passed = hasWord1 && hasWord2 && !hasForbidden;
      
      let details = `Required: ${word1} (${hasWord1 ? '✓' : '✗'}), ${word2} (${hasWord2 ? '✓' : '✗'})`;
      if (hasForbidden) {
        details += `, Forbidden: ${forbiddenWord} (${hasForbidden ? 'found - ✗' : 'not found - ✓'})`;
      }
      
      return { rule, passed, details };
    }
  }
  
  // Rule: "Document must contain the word X" - single word requirement
  if (lowerRule.includes('must contain the word')) {
    const wordPattern = /must contain the word\s+(\w+)/i;
    const match = rule.match(wordPattern);
    
    if (match) {
      const requiredWord = match[1];
      const hasWord = lowerText.includes(requiredWord.toLowerCase());
      
      return {
        rule,
        passed: hasWord,
        details: hasWord 
          ? `Found required word: ${requiredWord}` 
          : `Required word not found: ${requiredWord}`
      };
    }
  }
  
  // Rule: Generic "must contain" with CAPS words
  if (lowerRule.includes('must contain')) {
    const capsWords = rule.match(/\b[A-Z]{2,}\b/g);
    
    if (capsWords && capsWords.length > 0) {
      const foundWords = capsWords.filter(word => lowerText.includes(word.toLowerCase()));
      const passed = foundWords.length === capsWords.length;
      
      return {
        rule,
        passed,
        details: `Required words: ${capsWords.join(', ')} - Found: ${foundWords.join(', ')} (${foundWords.length}/${capsWords.length})`
      };
    }
  }
  
  // If no specific pattern matches, return a generic failure
  return {
    rule,
    passed: false,
    details: 'Rule pattern not recognized or not applicable'
  };
}

/**
 * Validates document text against all rules
 */
function validateDocument(documentText: string, rules: string[], dynamicForbiddenWords: string[]): ValidationResult[] {
  return rules.map(rule => validateRule(rule, documentText, dynamicForbiddenWords));
}

// NEW FUNCTION: Perform validation for a single rule using OpenAI
async function performOpenAIValidationForRule(rule: string, documentText: string): Promise<ValidationResult> {
  if (!openai) {
    console.warn(`[VALIDATE-OpenAI] OpenAI client not configured for rule: "${rule}". Falling back.`);
    return {
      rule,
      passed: false,
      details: "OpenAI not configured for this validation rule; pattern not recognized by fallback.",
    };
  }

  const modelToUse = "gpt-3.5-turbo"; // Or your preferred model, e.g., gpt-4
  const requestBody = {
    model: modelToUse,
    messages: [
      {
        role: "system" as const,
        content: "You are a precise document validation engine. Analyze the document text against the provided rule. Respond ONLY with a JSON object containing two keys: \"passed\" (boolean) and \"details\" (a brief explanation, max 2 sentences). For rules like \"must contain [X]\" or \"must have [X]\", the rule passes if X is found in the document, regardless of surrounding context like negation, unless the rule explicitly states negation (e.g., \"must NOT contain [X]\"). If \"passed\" is true, \"details\" should confirm adherence (e.g., \"The document adheres to this rule because X was found.\"). If \"passed\" is false, \"details\" should explain why (e.g., \"The document fails because X was not found, or the rule specified absence and X was present.\"). If a rule is too ambiguous, set \"passed\" to false and explain in \"details\". Ensure \"details\" is always a string."
      },
      {
        role: "user" as const,
        content: `Document Text (first 15000 chars):\n\"\"\"\n${documentText.substring(0, 15000)}\n\"\"\"\n\nRule: "${rule}"\n\nDoes the document text pass this rule? Respond with JSON.`,
      },
    ],
    response_format: { type: "json_object" as const },
    max_tokens: 150,
    temperature: 0.1,
  };

  console.log(`[VALIDATE-OpenAI] Sending request for rule: "${rule}" to model ${modelToUse}. Request body (messages only):`, JSON.stringify(requestBody.messages, null, 2));

  try {
    const completion = await openai.chat.completions.create(requestBody);

    const rawResponse = completion.choices[0]?.message?.content?.trim();
    console.log(`[VALIDATE-OpenAI] Raw response for rule "${rule}":\nSTART RAW RESPONSE ====\n${rawResponse}\n==== END RAW RESPONSE`);

    if (rawResponse) {
      try {
        // Attempt to clean known non-JSON prefixes/suffixes if any (though response_format should prevent this)
        let cleanedResponse = rawResponse;
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.substring(7);
          if (cleanedResponse.endsWith("```")) {
            cleanedResponse = cleanedResponse.slice(0, -3);
          }
        }
        cleanedResponse = cleanedResponse.trim();

        const parsedResponse = JSON.parse(cleanedResponse);
        console.log(`[VALIDATE-OpenAI] Parsed response for rule "${rule}":`, parsedResponse);
        return {
          rule,
          passed: typeof parsedResponse.passed === 'boolean' ? parsedResponse.passed : false,
          details: typeof parsedResponse.details === 'string' ? parsedResponse.details : "Invalid response content (details missing or not string).",
        };
      } catch (parseError) {
        console.error(`[VALIDATE-OpenAI] Error parsing OpenAI JSON response for rule "${rule}":`, parseError, "\nRaw response was: ====\n" + rawResponse + "\n====");
        return { rule, passed: false, details: "Error: AI response was not valid JSON. Raw: " + rawResponse.substring(0,100) + "..." }; // Truncate raw response in details for UI
      }
    }
    console.warn(`[VALIDATE-OpenAI] No response content from AI for rule "${rule}".`);
    return { rule, passed: false, details: "Error: No response content from AI." };
  } catch (error) {
    console.error(`[VALIDATE-OpenAI] Error validating rule '${rule}' with OpenAI API:`, error);
    return { rule, passed: false, details: "Error contacting AI for validation." };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dtvFile = formData.get('file') as File;
    const forbiddenFile = formData.get('forbiddenWordsFile') as File | null;
    const customRulesText = formData.get('customRules') as string | null;

    if (!dtvFile) {
      return NextResponse.json({ error: 'Document to Validate (DTV) not uploaded' }, { status: 400 });
    }
    
    if (dtvFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'DTV file too large. Maximum size is 10MB.' }, { status: 400 });
    }
    const allowedDtvTypes = ['application/pdf', 'text/plain'];
    if (!allowedDtvTypes.includes(dtvFile.type)) {
      return NextResponse.json({ error: `Invalid DTV file type: ${dtvFile.type}. Only PDF and text files allowed.` }, { status: 400 });
    }

    let dynamicForbiddenWords: string[] = [];
    if (forbiddenFile) {
      console.log(`Processing forbidden words file: ${forbiddenFile.name} (${forbiddenFile.type}, ${forbiddenFile.size} bytes)`);
      if (forbiddenFile.size > 1 * 1024 * 1024) { // Max 1MB for forbidden list
        return NextResponse.json({ error: 'Forbidden words file too large. Maximum size is 1MB.' }, { status: 400 });
      }
      // Stricter validation for .txt extension and text/plain type
      const isTxtExtension = forbiddenFile.name.toLowerCase().endsWith('.txt');
      const isTextPlainType = forbiddenFile.type === 'text/plain';

      if (!isTxtExtension || !isTextPlainType) {
        let specificError = 'Invalid forbidden words file. Must be a .txt file with type text/plain.';
        if (!isTxtExtension) {
          specificError = 'Invalid forbidden words file: incorrect extension (must be .txt).';
        } else if (!isTextPlainType) {
          specificError = 'Invalid forbidden words file: incorrect MIME type (must be text/plain).';
        }
        return NextResponse.json({ error: specificError }, { status: 400 });
      }

      const forbiddenText = await extractText(forbiddenFile);
      dynamicForbiddenWords = forbiddenText.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length > 0);
      console.log('Parsed forbidden words:', dynamicForbiddenWords);
    }
    
    const documentText = await extractText(dtvFile);
    console.log(`Processing DTV: ${dtvFile.name} (${dtvFile.type}, ${dtvFile.size} bytes)`);
    if (!documentText.trim()) {
      return NextResponse.json({ error: 'No text found in the DTV' }, { status: 400 });
    }
    
    const htmlIndicators = ['<script', '<html', '<body', 'window.__', 'document.get', '<!DOCTYPE'];
    if (htmlIndicators.some(indicator => documentText.toLowerCase().includes(indicator.toLowerCase()))) {
      return NextResponse.json({ error: 'DTV appears to contain HTML/JavaScript. Please upload clean text or PDF.' }, { status: 400 });
    }
    
    let rules: string[] = [];
    let usingNLPRules = false;

    if (customRulesText && customRulesText.trim() !== '') {
      rules = customRulesText.split('\n').map(rule => rule.trim()).filter(rule => rule.length > 0);
      usingNLPRules = true;
      console.log("VALIDATION: Using custom rules provided by user:", rules);
    } else {
      console.log("VALIDATION: No custom rules provided, using default hardcoded rules.");
      rules = [
        'Names must be capitalized',
        'Document must contain the word CONFIDENTIAL',
        'Email addresses must be in valid format',
        'Phone numbers must be in valid format',
        'SSN cannot be blank',
        'Document must contain MUSTARD and MAYO but not KETCHUP'
      ];
    }

    let validationResults: ValidationResult[] = [];
    const processedForbiddenWordsRule = false; // To track if forbidden words rule was handled by LLM or needs separate processing

    // Handle Forbidden Words Rule separately first (as it's a direct check)
    // Or, it could also be phrased as a rule for the LLM, e.g., "The document must not contain any of the following words: [word1, word2]"
    let activeRules = [...rules]; // Rules to be processed either by LLM or regex
    if (dynamicForbiddenWords.length > 0 || forbiddenFile) {
      const forbiddenRuleString = 'Must not contain uploaded forbidden words';
      // If not already in custom rules, add it for processing.
      if (!rules.find(r => r.toLowerCase() === forbiddenRuleString.toLowerCase())) {
        activeRules.unshift(forbiddenRuleString);
      }
    }

    if (usingNLPRules && openai) {
      console.log("VALIDATION: Processing rules with OpenAI.");
      const openAIPromises = activeRules.map(rule => 
        performOpenAIValidationForRule(rule, documentText)
      );
      validationResults = await Promise.all(openAIPromises);
    } else {
      console.log("VALIDATION: Processing rules with legacy regex/heuristic logic.");
      // Fallback to existing regex-based validation for all rules if OpenAI isn't used for custom rules
      validationResults = validateDocument(documentText, activeRules, dynamicForbiddenWords);
    }
    
    const report: ValidationReport = {
      results: validationResults,
      documentText: documentText.substring(0, 2000) + (documentText.length > 2000 ? '...' : '')
    };
    
    return NextResponse.json(report);
    
  } catch (error) {
    console.error('Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during validation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 