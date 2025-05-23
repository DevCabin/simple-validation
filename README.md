# Document Validation Web App

A minimal Next.js 14 web application that validates uploaded PDF or text documents against a set of configurable rules.
This project serves as a Proof of Concept for HIPAA Safe AI.

## Features

- **File Upload**: Supports PDF and text file uploads
- **Text Extraction**: Automatically extracts text from PDF files using `pdf-parse`
- **Rule-Based Validation**: Validates documents against customizable rules
- **GitHub Integration**: Fetches validation rules from public GitHub repositories via gitmcp.io (Note: This feature is less prominent now with custom NLP rules).
- **NLP-Based Custom Rules**: Allows users to input validation rules in natural language, interpreted by OpenAI.
- **Modern UI & Styling (HIPAA Safe AI Theme)**:
    - Dark theme with teal accents, inspired by `hipaasafeai.com/cloud.html`.
    - Custom fonts: Alexandria for body, Outfit for headings (via Google Fonts).
    - Dynamic particle background effect using `@tsparticles/react`.
    - Frosted glass effect (backdrop-blur) on content cards.
- **Real-time Results**: Shows validation results with pass/fail status and details.
- **Updated Branding**: Page title and main heading are now "HIPAA Safe AI - Proof of Concept Demo".

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone this repository:
```bash
git clone <your-repository-url>
cd simple-validation-1
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment to Vercel

This app is ready for deployment to Vercel with zero configuration:

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy automatically

Alternatively, use the Vercel CLI:
```bash
npm install -g vercel
vercel
```

## Configuration

### Setting up Validation Rules

The app fetches validation rules from a GitHub repository via gitmcp.io. To configure your own rules:

1. Create a public GitHub repository
2. Add a rules file (e.g., `rules.txt` or `rules.md`)
3. Update the `rulesUrl` in `src/app/api/validate/route.ts`:

```typescript
const rulesUrl = 'https://gitmcp.io/your-username/your-repo/main/path/to/rules.txt';
```

### Rule Format

Each rule should be on a separate line. The app supports various rule patterns:

#### Example Rules:
```
Names must be capitalized
Document must contain the word CONFIDENTIAL  
Email addresses must be in valid format
Phone numbers must be in valid format
SSN cannot be blank
Document must contain MUSTARD and MAYO but not KETCHUP
```

#### Supported Rule Types:

1. **Name Capitalization**: Rules containing "name" and "capitalized"
2. **Keyword Requirements**: Rules with "must contain" or specific keywords
3. **Email Validation**: Rules mentioning "email" and "format"
4. **Phone Validation**: Rules mentioning "phone" and "format" 
5. **SSN Validation**: Rules about SSN being blank
6. **Complex Word Logic**: Rules with AND/OR/NOT logic for multiple keywords

## Sample Rules Repository

For testing, you can use these sample rules by creating a file in your GitHub repo:

```
Names must be capitalized
Document must contain the word CONFIDENTIAL
Email addresses must be in valid format
Phone numbers must be in valid format
SSN cannot be blank
Document must contain MUSTARD and MAYO but not KETCHUP
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── preview-rules/
│   │   │   └── route.ts          # API endpoint for NLP rule preview
│   │   └── validate/
│   │       └── route.ts          # API endpoint for file processing & validation
│   ├── globals.css               # Global styles, font definitions, dark theme CSS vars
│   ├── layout.tsx               # Root layout, global font import (Alexandria, Outfit)
│   └── page.tsx                 # Main UI component
├── components/
│   └── ParticlesBackground.tsx  # Particle animation component
├── utils/
│   └── textValidation.ts        # Client-side rule text pre-validation
├── public/
// ... existing code ...

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **OpenAI API (gpt-3.5-turbo)**: For NLP rule interpretation and validation.
- **pdf-parse**: PDF text extraction
- **@tsparticles/react & @tsparticles/slim**: For particle background effects.
- **Google Fonts (next/font/google)**: Alexandria (body), Outfit (headings).
- **Multer**: For handling multipart/form-data (file uploads).
- **gitmcp.io**: GitHub file access API (less emphasized now).

## Validation Logic

The app includes intelligent pattern matching for different rule types:

- **Name validation**: Detects capitalized names using regex patterns
- **Email validation**: Uses standard email regex patterns
- **Phone validation**: Supports various US phone number formats
- **SSN validation**: Detects XXX-XX-XXXX patterns
- **Keyword matching**: Flexible keyword detection with AND/OR/NOT logic
- **Fallback validation**: Generic keyword extraction for custom rules

## Sample Test Documents

Create test documents with:

**PDF or Text content:**
```
CONFIDENTIAL DOCUMENT

Name: John Smith
Email: john.smith@example.com  
Phone: (555) 123-4567
SSN: 123-45-6789

This document contains MUSTARD and MAYO for sandwiches.
```

This sample will pass most validation rules and demonstrate the validation features.

## Development

### Adding New Rule Types

To add new validation patterns, modify the `validateRule` function in `src/app/api/validate/route.ts`:

```typescript
// Add new rule pattern
if (lowerRule.includes('your-pattern')) {
  // Your validation logic
  return {
    rule,
    passed: true/false,
    details: 'Your details'
  };
}
```

### Customizing the UI

The main UI is in `src/app/page.tsx`.
Global styles, including the dark theme, CSS variables, and base font applications, are in `src/app/globals.css`.
Google Fonts (Alexandria, Outfit) are imported and made available via CSS variables in `src/app/layout.tsx` and configured in `tailwind.config.ts`.
The dynamic particle background is implemented in `src/components/ParticlesBackground.tsx` and rendered in `src/app/page.tsx`. Content cards in `page.tsx` use `backdrop-blur-sm` for a frosted effect.

## Troubleshooting

- **PDF not processing**: Ensure the PDF contains selectable text (not just images)
- **Rules not loading**: Check that your GitHub repository is public and the URL is correct
- **File upload issues**: Verify file size limits and types in your deployment environment

## License

This project is open source and available under the MIT License.

## TODO

- **Improve SSN Rule Handling in AI Validation:**
  - Currently, a rule like "if a Social Security number is detected, flag it" results in `passed: true` with details "The document adheres to this rule." when an SSN is present. This is because the AI interprets "flag it" as "confirm its presence."
  - **Issue**: The document `sample-document.txt` contains `SSN: 123-45-6789`. With the rule "if a Social Security number is detected, flag it", the AI validation passes, which might be counter-intuitive if the intent is to *fail* or *warn* on SSN presence.
  - **Ambiguity**: The phrasing "if a Social Security number is detected, flag it" is too ambiguous for the AI if the desired outcome is a validation failure or a specific warning alert.
  - **Suggestion**: To make the AI treat the presence of an SSN as a validation failure, the rule should be more explicit. For example: `"The document must NOT contain a Social Security Number"`.
  - **Expected Outcome with Suggested Rule**: With the more explicit rule, if an SSN is found (as in `sample-document.txt`), the AI should return:
    ```json
    {
      "passed": false,
      "details": "The document fails because it contains a Social Security Number."
    }
    ```
    (or a similar message indicating failure due to SSN presence).
  - Further testing is needed with various phrasings for rules intended to detect and flag/fail sensitive information to ensure the AI's interpretation aligns with user intent.
