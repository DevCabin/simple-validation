# HIPAA Safe AI - Air-Gapped Prototype v2.1.0

> **AI-Powered Document Validation for HIPAA Compliance**  
> A secure, air-gapped prototype for validating documents against custom rules using natural language processing.

![HIPAA Safe AI Demo](https://img.shields.io/badge/Version-2.1.0-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-4.103.0-green)

## 🚀 Features

### Core Functionality
- **AI-Powered Validation**: Natural language rule interpretation using OpenAI GPT-3.5-turbo
- **Document Processing**: Support for PDF and text file uploads with intelligent text extraction
- **Hybrid Validation**: AI + regex fallback patterns for robust rule processing
- **Real-time Preview**: Test and validate rules before applying them to documents

### Advanced Safety Features (v2.1)
- **Conflict Detection**: Automatically detects contradictory rules (e.g., "must contain X" vs "must not contain X")
- **Rule Limit Protection**: Demo limited to 3 rules maximum for focused testing
- **Duplicate Prevention**: Backend deduplication ensures no duplicate rules are processed
- **Smart Word Analysis**: Filters common words to focus on significant terms for conflict detection

### User Experience
- **Managed Rules System**: Persistent rule collection with add/remove functionality
- **Visual Feedback**: Color-coded rule status (green=recognized, orange=conflict, red=error, yellow=unrecognized)
- **Forbidden Words Lists**: Upload custom .txt files with prohibited terms
- **Mobile Responsive**: Optimized for all screen sizes with custom breakpoints
- **Professional UI**: Modern dark theme with particle background effects

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.3.2, React 19, TypeScript 5
- **Styling**: Tailwind CSS 3.4.1 with custom design system
- **AI Integration**: OpenAI API 4.103.0 (GPT-3.5-turbo)
- **Document Processing**: pdf-parse for PDF text extraction
- **Animations**: TSParticles for background effects
- **Development**: ESLint, PostCSS, Turbopack for fast development

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- OpenAI API key (optional - app works with regex fallback)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd air_gapped_prototype
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
*Note: The app works without OpenAI API key using regex patterns, but AI features will be disabled.*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

## 📖 Usage Guide

### Basic Workflow
1. **Define Rules**: Enter up to 3 validation rules in natural language
2. **Preview & Test**: Use "Preview & Apply Rules" to test rule understanding
3. **Upload Document**: Select a PDF or text file to validate
4. **Review Results**: Get detailed validation results with explanations

### Example Rules
```
Document must contain patient consent statement
Must not contain Social Security Numbers
Names must be properly capitalized
Document must be dated within last 30 days
Email addresses must be in valid format
```

### Advanced Features

#### Conflict Detection
The system automatically detects conflicting rules:
- ✅ **Safe**: "must contain signatures" + "signatures must be dated"
- ⚠️ **Conflict**: "must contain mustard" + "must not contain mustard"

#### Managed Rules
- Successfully recognized rules are automatically added to your managed collection
- Rules persist across sessions within the browser
- Easy removal with trash button interface

#### Forbidden Words Lists
- Upload .txt files with prohibited terms (one per line)
- Automatically validates documents against uploaded lists
- Sample file available for download

## 🏗️ Architecture

### Frontend Structure
```
src/
├── app/
│   ├── api/
│   │   ├── validate/route.ts      # Main validation endpoint
│   │   └── preview-rules/route.ts # Rule preview & conflict detection
│   ├── components/
│   │   └── ParticlesBackground.tsx
│   ├── utils/
│   │   └── textValidation.ts      # Client-side validation helpers
│   └── page.tsx                   # Main application component
├── styles/
└── types/
```

### Key Components

#### Validation Engine (`/api/validate`)
- Processes documents and applies validation rules
- Combines managed rules with custom rules
- Handles both AI and regex-based validation
- Supports forbidden words lists

#### Conflict Detection (`/api/preview-rules`)
- Analyzes rules for contradictions
- Classifies rule types (must_contain, must_not_contain, etc.)
- Provides detailed conflict explanations
- Prevents conflicting rules from being added

#### Frontend State Management
- React hooks for state management
- Real-time validation feedback
- Error handling and user guidance
- Responsive UI updates

## 🔒 Security Features

### Air-Gapped Design
- No external dependencies during runtime (except optional OpenAI API)
- Local document processing
- No data persistence on server
- Client-side file handling

### Data Protection
- Documents processed in memory only
- No file storage on server
- Configurable API endpoints
- Input validation and sanitization

## 🧪 Testing

### Manual Testing
1. **Rule Conflicts**: Try "must contain X" and "must not contain X"
2. **Rule Limits**: Enter more than 3 rules to test limit enforcement
3. **Document Types**: Test with various PDF and text files
4. **Edge Cases**: Empty files, large files, special characters

### API Testing
```bash
# Test rule preview
curl -X POST http://localhost:3000/api/preview-rules \
  -H "Content-Type: application/json" \
  -d '{"customRulesText":"must contain test\nmust not contain test"}'

# Test validation
curl -X POST http://localhost:3000/api/validate \
  -F "file=@sample.txt" \
  -F "customRules=must contain test"
```

## 🚧 Known Limitations

- Demo limited to 3 rules maximum
- OpenAI API required for advanced natural language understanding
- Large PDF files (>10MB) not supported
- Browser-based state management (no server persistence)

## 🔮 Future Enhancements

### Planned Features (v3.0)
- [ ] Semantic conflict detection beyond word-based matching
- [ ] Rule templates for common HIPAA scenarios
- [ ] Batch document processing
- [ ] Export/import rule sets
- [ ] Advanced analytics and reporting
- [ ] Custom regex pattern builder
- [ ] Integration with document management systems

### Technical Improvements
- [ ] Server-side rule persistence
- [ ] Enhanced PDF processing capabilities
- [ ] Performance optimizations for large documents
- [ ] Comprehensive test suite
- [ ] Docker containerization

## 🤝 Contributing

This is a proof-of-concept prototype. For production use, consider:
- Comprehensive security audit
- Performance testing with large document sets
- Integration with existing HIPAA compliance workflows
- Enhanced error handling and logging

## 📄 License

This project is a prototype for demonstration purposes. Please ensure compliance with your organization's security and privacy requirements before production use.

## 🆘 Support

For technical issues or questions:
1. Check the browser console for error messages
2. Verify OpenAI API key configuration
3. Ensure file types are supported (PDF, TXT)
4. Review rule syntax and conflict detection messages

---

**Version 2.1.0** - Enhanced conflict detection and user safety features  
**Built with ❤️ for HIPAA compliance and document security**
