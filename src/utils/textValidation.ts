interface RuleValidationFeedback {
  warning?: string;
  error?: string;
}

/**
 * Checks a single rule string for potential issues like malicious patterns or unusual capitalization.
 * @param rule The rule string to validate.
 * @returns An object containing an optional warning or error message.
 */
export function validateRuleText(rule: string): RuleValidationFeedback {
  // 1. Basic Malicious Content Check (very rudimentary)
  const maliciousPatterns = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, /onerror\s*=/i, /onload\s*=/i, /javascript:/i];
  for (const pattern of maliciousPatterns) {
    if (pattern.test(rule)) {
      return { error: "Rule appears to contain potentially unsafe content (e.g., script tags, JS events). Please revise." };
    }
  }

  // 2. Capitalization Checks
  // Ignore very short rules for capitalization warnings
  if (rule.length > 3) {
    // Check for ALL CAPS
    const isAllCaps = rule === rule.toUpperCase() && rule !== rule.toLowerCase(); // Ensure it's not all non-alphabetic
    if (isAllCaps) {
      return { warning: `This rule is in ALL CAPS. Is this intended? (Content: '${rule.substring(0, 50)}${rule.length > 50 ? '...' : ''}')` };
    }

    // Check for oDd cApItAlIzAtIoN (more than 2 uppercase letters not at the start of a word or after a space)
    // This is a heuristic and might need refinement.
    let unusualCapsCount = 0;
    const words = rule.split(/\s+/);
    for (const word of words) {
      if (word.length > 1) { // Ignore single letter words for this specific check
        for (let i = 1; i < word.length; i++) { // Start from second letter
          if (word[i] >= 'A' && word[i] <= 'Z') {
            unusualCapsCount++;
            if (unusualCapsCount > 2) break; // Stop if we found enough evidence
          }
        }
      }
      if (unusualCapsCount > 2) break;
    }
    
    if (unusualCapsCount > 2) {
      return { warning: `This rule has unusual capitalization. Is this intended? (Content: '${rule.substring(0, 50)}${rule.length > 50 ? '...' : ''}')` };
    }
  }

  return {}; // No issues found
}

// Example Usage (for testing - can be removed)
/*
console.log("Test 1: Normal rule", validateRuleText("Names must be capitalized."));
console.log("Test 2: Script tag", validateRuleText("test <script>alert('xss')</script>"));
console.log("Test 3: All CAPS", validateRuleText("MUST CONTAIN SECRET"));
console.log("Test 4: Short ALL CAPS", validateRuleText("MAX"));
console.log("Test 5: Odd Caps", validateRuleText("nAmEs MuSt bE cApItAlIzEd"));
console.log("Test 6: Mixed normal and odd", validateRuleText("This Is oKaY bUt ThIsIsNoT"));
console.log("Test 7: OnError", validateRuleText("Image <img src=x onerror=alert(1)>"));
*/ 