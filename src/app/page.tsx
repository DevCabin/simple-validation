'use client';

import { useState, useEffect } from 'react';
import { validateRuleText } from '../utils/textValidation';
import ParticlesBackground from '../components/ParticlesBackground';

interface ValidationResult {
  rule: string;
  passed: boolean;
  details?: string;
}

interface ValidationReport {
  results: ValidationResult[];
  documentText: string;
}

interface RuleFeedback {
  originalRule: string;
  interpretation: string;
  status: 'recognized' | 'unrecognized' | 'error' | 'conflict';
}

interface RuleInputFeedback {
  rule: string;
  type: 'warning' | 'error';
  message: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [forbiddenWordsFile, setForbiddenWordsFile] = useState<File | null>(null);
  const [customRules, setCustomRules] = useState<string>('');
  const [rulesFeedback, setRulesFeedback] = useState<RuleFeedback[]>([]);
  const [isPreviewingRules, setIsPreviewingRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ruleInputFeedback, setRuleInputFeedback] = useState<RuleInputFeedback[]>([]);
  const [showCapitalizationConfirm, setShowCapitalizationConfirm] = useState(false);
  const [rulesTextForConfirmation, setRulesTextForConfirmation] = useState('');

  // Settings accordion state
  const [showSettings, setShowSettings] = useState(false);
  const [managedRules, setManagedRules] = useState<string[]>([]);

  const addRuleToList = (rule: string) => {
    if (!managedRules.includes(rule)) {
      setManagedRules(prev => [...prev, rule]);
    }
  };

  const removeRuleFromList = (index: number) => {
    setManagedRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleDTVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or text file for the document to validate.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setReport(null);
    }
  };

  const handleForbiddenWordsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isTxtExtension = selectedFile.name.toLowerCase().endsWith('.txt');
      const isTextPlainType = selectedFile.type === 'text/plain';

      if (!isTxtExtension || !isTextPlainType) {
        let specificError = 'Please upload a .txt file (must have .txt extension and be a plain text file type).';
        if (!isTxtExtension) {
          specificError = 'Invalid file extension. Please upload a .txt file.';
        } else if (!isTextPlainType) {
          specificError = 'Invalid file type. Please ensure the .txt file is a plain text file (type text/plain).';
        }
        setError(specificError);
        setForbiddenWordsFile(null);
        return;
      }
      setForbiddenWordsFile(selectedFile);
      setError(null);
      setReport(null);
    }
  };

  const handleCustomRulesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomRules(e.target.value);
    setReport(null);
    setRulesFeedback([]);
    setRuleInputFeedback([]);
    setShowCapitalizationConfirm(false);
  };

  const processRuleInput = (rulesToProcess: string): { errors: RuleInputFeedback[], warnings: RuleInputFeedback[], capWarnRules: string[] } => {
    const lines = rulesToProcess.split('\n').filter(line => line.trim() !== '');
    const errors: RuleInputFeedback[] = [];
    const warnings: RuleInputFeedback[] = [];
    const capWarnRules: string[] = [];

    lines.forEach(line => {
      const feedback = validateRuleText(line);
      if (feedback.error) {
        errors.push({ rule: line, type: 'error', message: feedback.error });
      }
      if (feedback.warning) {
        warnings.push({ rule: line, type: 'warning', message: feedback.warning });
        if (feedback.warning.includes("capitalization") || feedback.warning.includes("ALL CAPS")) {
          capWarnRules.push(line);
        }
      }
    });
    return { errors, warnings, capWarnRules };
  };

  const handlePreviewRules = async (proceedWithCapConfirmedRules = false) => {
    let rulesToProcess = customRules;
    if (proceedWithCapConfirmedRules) {
      rulesToProcess = rulesTextForConfirmation;
    }

    if (rulesToProcess.trim() === '' && !proceedWithCapConfirmedRules) {
      setRulesFeedback([
        {
          originalRule: 'Input Area Empty',
          interpretation: 'Please enter some rules to preview.',
          status: 'error',
        },
      ]);
      return;
    }

    // Check rule count limit (max 3 rules for demo)
    const ruleLines = rulesToProcess.split('\n').filter(line => line.trim() !== '');
    if (ruleLines.length > 3) {
      setRulesFeedback([
        {
          originalRule: 'Too Many Rules',
          interpretation: `Demo limited to 3 rules maximum. You entered ${ruleLines.length} rules. Please reduce to 3 or fewer.`,
          status: 'error',
        },
      ]);
      setError(`Demo limited to 3 rules maximum. Please reduce your ${ruleLines.length} rules to 3 or fewer.`);
      return;
    }

    if (!proceedWithCapConfirmedRules) {
      const { errors, warnings, capWarnRules } = processRuleInput(rulesToProcess);
      setRuleInputFeedback([...errors, ...warnings]);

      if (errors.length > 0) {
        return;
      }
      if (capWarnRules.length > 0) {
        setRulesTextForConfirmation(rulesToProcess);
        setShowCapitalizationConfirm(true);
        return;
      }
    }
    
    // If we are here, either no cap warnings, or user confirmed them.
    // Clear capitalization specific warnings if any were shown, but keep others
    setRuleInputFeedback(prev => prev.filter(f => 
      !(f.type === 'warning' && (f.message.includes("capitalization") || f.message.includes("ALL CAPS")))
    ));
    setShowCapitalizationConfirm(false); // Ensure confirmation is hidden

    setIsPreviewingRules(true);
    setRulesFeedback([]);
    
    try {
      const response = await fetch('/api/preview-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customRulesText: rulesToProcess }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to preview rules' }));
        throw new Error(errorData.error);
      }
      const feedbackData = await response.json();
      setRulesFeedback(feedbackData.feedback || []);
      
      // Check for conflicts and show error if any exist
      if (feedbackData.hasConflicts) {
        setError(`Rule conflicts detected! Please resolve the conflicting rules before proceeding. Check the preview below for details.`);
        return; // Don't auto-add any rules if there are conflicts
      }
      
      // Auto-add successfully recognized rules to the managed rules list (only if no conflicts)
      feedbackData.feedback?.forEach((fb: RuleFeedback) => {
        if (fb.status === 'recognized') {
          addRuleToList(fb.originalRule);
        }
      });
    } catch (err) {
      setRulesFeedback([
        {
          originalRule: 'Error',
          interpretation: err instanceof Error ? err.message : 'Could not fetch rule preview.',
          status: 'error',
        },
      ]);
    } finally {
      setIsPreviewingRules(false);
      if (proceedWithCapConfirmedRules) {
        setRulesTextForConfirmation('');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a Document to Validate (DTV) first.');
      return;
    }

    if (customRules.trim() !== '' && !showCapitalizationConfirm) {
      const { errors, capWarnRules } = processRuleInput(customRules);
      const allFeedback = [...errors, ...ruleInputFeedback.filter(f => !errors.find(e => e.rule === f.rule))];
      setRuleInputFeedback(allFeedback);

      if (errors.length > 0) {
        setError("Please fix the errors in your custom rules before validating.");
        return;
      }
      if (capWarnRules.length > 0 && !rulesFeedback.some(rf => capWarnRules.includes(rf.originalRule))) {
        setError("Unusual capitalization detected in rules. Please use 'Preview & Apply Rules' to confirm.");
        setRulesTextForConfirmation(customRules);
        setShowCapitalizationConfirm(true);
        return;
      }
    }
    if (showCapitalizationConfirm) {
      setError("Please address the capitalization warnings for your custom rules first.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (forbiddenWordsFile) {
      formData.append('forbiddenWordsFile', forbiddenWordsFile);
    }
    if (customRules.trim() !== '') {
      formData.append('customRules', customRules);
    }
    // Send the managed rules so backend can use them alongside custom rules
    formData.append('managedRules', JSON.stringify(managedRules));

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Upload failed: ${response.statusText}` }));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during validation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-foreground-dark py-8 px-4 sm:px-6 lg:px-8 relative">
      <ParticlesBackground />
      <header className="mb-10 text-center relative z-10">
        <h1 className="text-5xl font-extrabold text-brand-teal">
          HIPAA Safe AI - Proof of Concept Demo
        </h1>
        <p className="mt-3 text-lg text-gray-400">
          <strong className="text-brand-teal">Define</strong> validation rules, <strong className="text-brand-teal">upload</strong> your document, and ensure compliance <strong className="text-brand-teal">the first time</strong>.
        </p>
      </header>

      <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Settings/Rule Uploads */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[rgba(30,30,30,0.85)] backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-border-dark">
            <h2 className="text-2xl font-semibold text-brand-teal mb-6 border-b border-border-dark pb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Validation Settings
            </h2>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="custom-rules-input" className="block text-sm font-medium text-gray-300 mb-1.5">
                  AI-Powered Validation Rules (natural language commands)
                </label>
                <p className="text-sm text-gray-300 mb-1.5">
                  AI-powered validation engine understands natural language commands about your document. Write rules in plain English and let AI interpret them intelligently. <strong className="text-brand-teal">Demo limited to 3 rules maximum.</strong> Use "Preview & Apply Rules" to see how AI understands your instructions.
                </p>
                <textarea
                  id="custom-rules-input"
                  rows={6}
                  className={`block w-full text-sm text-foreground-dark border-2 rounded-lg shadow-sm focus:ring-brand-teal focus:border-brand-teal sm:text-sm p-2.5 bg-background-dark outline-none focus:ring-2 hover:border-brand-teal transition-colors placeholder-gray-500 ${
                    ruleInputFeedback.some(f => f.type === 'error') ? 'border-red-500' : ruleInputFeedback.some(f => f.type === 'warning') ? 'border-yellow-500' : 'border-border-dark'
                  }`}
                  placeholder="E.g., Document must contain Dr Signature • Must not contain SSN • Names must be redacted • Must be dated"
                  value={customRules}
                  onChange={handleCustomRulesChange}
                  disabled={loading || isPreviewingRules}
                />
              </div>
              <button
                onClick={() => handlePreviewRules()}
                disabled={loading || isPreviewingRules || customRules.trim() === ''}
                className="w-full bg-brand-teal text-white px-4 py-2.5 rounded-lg hover:bg-opacity-80 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out text-sm font-semibold shadow-md"
              >
                {isPreviewingRules ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Previewing...
                  </span>
                ) : 'Preview & Apply Rules'}
              </button>

              {ruleInputFeedback.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-xs text-gray-400 font-semibold">Rule Quick Checks:</h5>
                  {ruleInputFeedback.map((feedback, index) => (
                    <div 
                      key={`input-fb-${index}`}
                      className={`p-2 rounded-md text-xs border-l-4 ${feedback.type === 'error' ? 'bg-red-900 bg-opacity-40 text-red-300 border-red-500' : 'bg-yellow-900 bg-opacity-40 text-yellow-300 border-yellow-500'}`}>
                      <p className="font-medium break-all"><strong>{feedback.type === 'error' ? 'Error:' : 'Warning:'}</strong> {feedback.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {showCapitalizationConfirm && (
                <div className="mt-4 p-3 bg-card-background-dark rounded-lg border border-yellow-500 shadow-lg">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-2">Capitalization Check</h4>
                  <p className="text-xs text-gray-300 mb-3">Some rules have unusual capitalization. Please review:</p>
                  <div className="space-y-1 mb-3 max-h-20 overflow-y-auto">
                    <ul className="list-disc list-inside text-xs text-yellow-400">
                      {ruleInputFeedback.filter(f => 
                        f.type === 'warning' && (f.message.includes("capitalization") || f.message.includes("ALL CAPS"))
                      ).map((f, i) => (
                        <li key={`cap-warn-${i}`}>{f.message}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-300 mb-3">Proceed with these rules as written?</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handlePreviewRules(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors">
                      Yes, Proceed As Written
                    </button>
                    <button 
                      onClick={() => {
                        setShowCapitalizationConfirm(false);
                        // Optionally, clear only capitalization warnings or prompt user to edit
                        // setRuleInputFeedback(prev => prev.filter(f => !(f.type === 'warning' && (f.message.includes("capitalization") || f.message.includes("ALL CAPS"))))); 
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors">
                      No, I'll Edit Them
                    </button>
                  </div>
                </div>
              )}

              {/* Section for AI Rule Interpretations Preview */}
              {rulesFeedback.length > 0 && (
                <div className="mt-6 space-y-3 pt-4 border-t border-border-dark">
                  <h4 className="text-md font-semibold text-brand-teal mb-2">
                    Rule Interpretations (Preview):
                  </h4>
                  {rulesFeedback.map((fb, index) => (
                    <div
                      key={`rule-fb-${index}`}
                      className={`p-3 rounded-lg shadow-sm border-l-4 ${
                        fb.status === 'error'
                          ? 'bg-red-900 bg-opacity-30 border-red-500'
                          : fb.status === 'conflict'
                          ? 'bg-orange-900 bg-opacity-30 border-orange-500'
                          : fb.status === 'unrecognized'
                          ? 'bg-yellow-900 bg-opacity-30 border-yellow-500'
                          : 'bg-green-900 bg-opacity-30 border-green-500'
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-0.5">
                        <strong>Original:</strong> {fb.originalRule}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          fb.status === 'error'
                            ? 'text-red-300'
                            : fb.status === 'conflict'
                            ? 'text-orange-300'
                            : fb.status === 'unrecognized'
                            ? 'text-yellow-300'
                            : 'text-green-300'
                        }`}
                      >
                        <strong>Interpretation:</strong> {fb.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Settings Accordion */}
              <div className="mt-6 border-t border-border-dark pt-5">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-between text-left p-3 bg-[rgba(40,40,40,0.6)] hover:bg-[rgba(40,40,40,0.8)] rounded-lg border border-border-dark transition-colors"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-300">Validation Settings</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transform transition-transform ${showSettings ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSettings && (
                  <div className="mt-3 p-4 bg-[rgba(25,25,25,0.8)] rounded-lg border border-border-dark">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Managed Rules
                      </label>
                      <p className="text-xs text-gray-400 mb-3">
                        These rules will always be applied during validation, alongside any custom rules entered above. Successfully recognized rules from the preview are automatically added here.
                      </p>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {managedRules.map((rule, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-[rgba(40,40,40,0.6)] rounded border border-gray-600 hover:border-gray-500 transition-colors">
                            <span className="text-sm text-gray-300 flex-1 pr-2">{rule}</span>
                            <button
                              onClick={() => removeRuleFromList(index)}
                              className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900 hover:bg-opacity-30 rounded transition-colors"
                              title="Remove rule"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        
                        {managedRules.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No rules defined. Add rules by using "Preview & Apply Rules" above.
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-2">
                        💡 Rules with green confirmations above are automatically added to this list.
                      </p>
                    </div>
                    
                    {/* Forbidden Words List - moved to settings */}
                    <div className="mt-6 pt-4 border-t border-gray-600">
                      <h3 className="text-sm font-medium text-gray-300 mb-1.5">Forbidden Words List</h3>
                      <p className="text-xs text-gray-400 mb-3">(Optional, .txt only, one per line)</p>
                      <a href="/sample-forbidden-words.txt" className="text-xs text-brand-teal hover:text-opacity-80 underline mb-2 block" download>
                        Download Sample.txt
                      </a>
                      <input
                        id="forbidden-words-upload-settings"
                        type="file"
                        accept=".txt"
                        onChange={handleForbiddenWordsFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-teal file:bg-opacity-80 file:text-white hover:file:bg-opacity-70 file:transition-colors file:cursor-pointer focus:ring-2 focus:ring-brand-teal outline-none shadow-sm"
                        disabled={loading || isPreviewingRules}
                      />
                      {forbiddenWordsFile && (
                        <div className="text-xs text-gray-400 mt-2 pl-1">
                          Selected List: {forbiddenWordsFile.name} ({(forbiddenWordsFile.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </div>
                  </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: DTV Upload & Validation Report */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[rgba(30,30,30,0.85)] backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-border-dark">
            <h2 className="text-2xl font-semibold text-brand-teal mb-6 border-b border-border-dark pb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Document To Validate (DTV)
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="dtv-upload" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Upload PDF or Text File
                </label>
                <input
                  id="dtv-upload"
                  type="file"
                  accept="application/pdf,text/plain"
                  onChange={handleDTVFileChange}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-teal file:bg-opacity-80 file:text-white hover:file:bg-opacity-70 file:transition-colors file:cursor-pointer focus:ring-2 focus:ring-brand-teal outline-none shadow-sm"
                  disabled={loading || isPreviewingRules}
                />
                {file && (
                  <div className="text-xs text-gray-400 mt-1.5 pl-1">
                    Selected DTV: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || loading || isPreviewingRules || ruleInputFeedback.some(f => f.type === 'error') || showCapitalizationConfirm}
                className="w-full bg-brand-teal text-white px-6 py-3 rounded-lg hover:bg-opacity-80 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out font-semibold shadow-md text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating Document...
                  </span>
                ) : 'Validate Document'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-50 text-red-300 border border-red-700 rounded-lg p-4 text-sm shadow-md">
              <h3 className="font-semibold mb-1">Error:</h3>
              <p>{error}</p>
            </div>
          )}

          {report && (
            <div className="bg-[rgba(30,30,30,0.85)] backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-border-dark">
              <h2 className="text-2xl font-semibold text-brand-teal mb-4 border-b border-border-dark pb-2">Validation Report</h2>
              <div className="mb-6 p-4 bg-background-dark rounded-lg border border-border-dark shadow-inner">
                <h3 className="text-lg font-semibold text-brand-teal mb-2">Overall Result:</h3>
                <p className={`text-xl font-bold ${report.results.every(r => r.passed) ? 'text-green-400' : 'text-red-400'}`}>
                  {report.results.filter(r => r.passed).length} / {report.results.length} rules passed
                </p>
              </div>

              <h3 className="text-lg font-semibold text-brand-teal mb-3">Rules Assessment:</h3>
              <div className="space-y-4">
                {report.results.map((result, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 shadow ${result.passed ? 'bg-green-900 bg-opacity-30 border-green-500' : 'bg-red-900 bg-opacity-30 border-red-500'}`}>
                    <h4 className={`font-semibold text-lg ${result.passed ? 'text-green-300' : 'text-red-300'} break-all`}>{result.rule}</h4>
                    <p className={`mt-1 text-sm flex items-center ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {result.passed ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Passed
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Failed
                        </>
                      )}
                    </p>
                    {result.details && (
                      <p className="mt-1.5 text-xs text-gray-400 break-all">{result.details}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t border-border-dark">
                <h3 className="text-lg font-semibold text-brand-teal mb-2">Document Preview (First 2000 chars):</h3>
                <pre className="text-xs text-gray-400 bg-background-dark p-3 rounded-md border border-border-dark whitespace-pre-wrap break-all overflow-x-auto shadow-inner">
                  {report.documentText}
                </pre>
              </div>
            </div>
          )}
          
          {!report && !loading && !error && (
             <div className="bg-[rgba(30,30,30,0.85)] backdrop-blur-sm rounded-xl shadow-2xl p-6 text-center border border-border-dark">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-foreground-dark">Define Rules and Upload Document</h3>
                <p className="mt-1 text-sm text-gray-400">Start by defining validation rules on the left, then upload your document here to validate it against those rules.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 pt-8 border-t border-border-dark text-center relative z-10">
        <p className="text-sm text-gray-500">
          Document Validation Hub &copy; {new Date().getFullYear()} - Powered by AI
        </p>
      </footer>
    </div>
  );
}
