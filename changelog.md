# Changelog

## [Unreleased] - YYYY-MM-DD (Current Session)

### Added
- **Initial Project Setup & Run:**
  - Started development server using `npm run dev`.
  - Created sample documents: `public/sample_pass.txt` and `public/sample_fail.txt`.
- **UI Enhancements (Initial):**
  - Relocated "Validate Document" button to the DTV card for better UX (`src/app/page.tsx`).
- **NLP-Based Custom Rule Input & Preview Functionality:**
  - Added a `textarea` for users to input custom validation rules (`src/app/page.tsx`).
  - Implemented a "Preview & Apply Rules" feature (`src/app/page.tsx`).
  - Created a new API endpoint `/api/preview-rules/route.ts` for rule interpretation.
  - Integrated OpenAI (`gpt-3.5-turbo`) for interpreting natural language rules in the preview endpoint.
  - Installed the `openai` npm package.
  - User configured OpenAI API key via `.env.local`.
- **NLP-Based Document Validation:**
  - Integrated OpenAI (`gpt-3.5-turbo`) into the main document validation logic (`/api/validate/route.ts`).
  - Created `performOpenAIValidationForRule` to get `{"passed": boolean, "details": string}` from AI for each rule.
  - Main `POST` handler now uses AI for custom rules if OpenAI is configured.
- **UI Theme Overhaul (Dark Theme with Teal Accents):**
  - Added custom dark theme color palette (dark backgrounds, light text, brand teal accent) to `tailwind.config.ts` and `src/app/globals.css`.
  - Made the dark theme the default for the application.
  - Extensively refactored `src/app/page.tsx` to apply the new dark theme, including cards, text, buttons, inputs, and overall layout to match reference design (`hipaasafeai.com/cloud.html`).
  - Corrected placeholder text in the "Upload DTV and Define Rules" section for dark theme visibility.
- **Custom Rule Input Pre-Validation:**
  - Created `src/utils/textValidation.ts` with `validateRuleText` function.
  - Implemented basic malicious content checks (e.g., script tags, JS events) for rules.
  - Implemented capitalization checks (ALL CAPS, unusual mixed case) for rules.
  - Integrated these pre-validation checks into `src/app/page.tsx` before rules are sent for preview or full validation.
  - Added UI elements to display errors (red) and warnings (yellow) directly below the rule input textarea.
  - Implemented a confirmation dialog flow for rules with capitalization warnings, asking the user to confirm before proceeding.
  - Logic to disable "Preview & Apply Rules" and "Validate Document" buttons based on these pre-validation states.
- **Documentation:**
  - Added a "TODO" section to `README.md` detailing ambiguity with the "if a Social Security number is detected, flag it" rule and suggesting clearer phrasing for AI.
  - Started this `changelog.md` file.
- **Visual Enhancements & Branding (Applied during this session but summarized here):**
    - Integrated Google Fonts: Alexandria (body) and Outfit (headings) via `next/font/google` in `src/app/layout.tsx` and `tailwind.config.ts`.
    - Implemented a dynamic particle background using `@tsparticles/react` and `@tsparticles/slim` (`src/components/ParticlesBackground.tsx`), configured to match the aesthetic of `hipaasafeai.com/cloud.html` (non-interactive by default).
    - Applied a `backdrop-blur-sm` effect to main content cards in `src/app/page.tsx` for a 'frosted glass' appearance over the particle background.
    - Updated HTML page title and main `<h1>` to 'HIPAA Safe AI - Proof of Concept Demo'.

### Changed
- **Rule Interpretation Logic:**
  - `/api/preview-rules/route.ts` initially used heuristic regex-based interpretation, now primarily uses OpenAI.
- **Validation Logic:**
  - `/api/validate/route.ts` previously used hardcoded regex/heuristic rules for all validations. Now, it uses OpenAI for user-provided custom rules and falls back to regex for default/non-NLP rules or if OpenAI is not configured.
- **OpenAI API Interaction:**
  - Refined system prompt for OpenAI in `/api/validate/route.ts` to ensure the `details` field is always returned in the JSON response, even for passing rules, resolving "Invalid response content" errors.
  - Improved error handling and logging for OpenAI API calls in validation and preview routes.

### Fixed
- Resolved issue where OpenAI validation sometimes returned JSON without a `details` field for passing rules, causing "Invalid response content (details missing or not string)" in the UI.
- Corrected CSS comment syntax in `src/app/globals.css` that caused linter errors.
- Addressed linter errors in `src/app/page.tsx` related to property access on the `RuleInputFeedback` type during the implementation of pre-validation checks.
- Corrected placeholder text color in the "Upload DTV and Define Rules" section of `src/app/page.tsx` to be visible on the dark theme.
- Resolved TypeScript and module resolution errors related to `@tsparticles/react` and its dependencies (`@tsparticles/engine`, `@tsparticles/slim`) during particle background implementation, including correcting prop usage for `Particles` component initialization and event handling. 