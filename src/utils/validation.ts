// Shared types for validation
export interface ValidationResult {
  rule: string;
  passed: boolean;
  details?: string;
}

export interface ValidationReport {
  results: ValidationResult[];
  documentText: string;
}

// Validation rule patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  CAPITALIZED_NAMES: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
} as const;

// Helper functions for common validations
export function maskSSN(ssn: string): string {
  return ssn.replace(/\d/g, '*');
}

export function truncateText(text: string, maxLength: number = 2000): string {
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
}

export function parseKeywordsFromRule(rule: string): {
  required: string[];
  forbidden: string[];
} {
  const required: string[] = [];
  const forbidden: string[] = [];
  
  // Extract words in caps
  const capsWords = rule.match(/\b[A-Z]{2,}\b/g) || [];
  required.push(...capsWords);
  
  // Extract quoted words
  const quotedWords = rule.match(/"([^"]+)"/g);
  if (quotedWords) {
    required.push(...quotedWords.map(w => w.replace(/"/g, '')));
  }
  
  // Handle "but not" patterns
  const butNotMatch = rule.match(/but\s+not\s+(\w+)/i);
  if (butNotMatch) {
    forbidden.push(butNotMatch[1]);
  }
  
  return { required, forbidden };
} 