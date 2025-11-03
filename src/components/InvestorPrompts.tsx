import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, ChevronDown, Save, X, MessageSquare, FileText, Mic } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface InvestorPromptsProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface InvestorPrompt {
  id?: string;
  report_name: 'Product-Analysis' | 'Market-Analysis' | 'Team-Analysis' | 'Financial-Analysis';
  custom_prompt: string | null;
}

const reportNames = ['Product-Analysis', 'Market-Analysis', 'Team-Analysis', 'Financial-Analysis'] as const;

const InvestorPrompts: React.FC<InvestorPromptsProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUtilitiesMenu, setShowUtilitiesMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prompts, setPrompts] = useState<Record<string, InvestorPrompt>>({});
  const [promptTexts, setPromptTexts] = useState<Record<string, string>>({
    'Product-Analysis': '',
    'Market-Analysis': '',
    'Team-Analysis': '',
    'Financial-Analysis': '',
  });
  const [savingPrompts, setSavingPrompts] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recordingPrompt, setRecordingPrompt] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const recordingBaseTextRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Check if user is an investor
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profile?.user_type !== 'investor') {
        navigate('/founder-dashboard');
        return;
      }

      await loadPrompts();
      await loadSystemPrompts();
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('investor_prompts')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error loading investor prompts:', error);
        setMessage({ type: 'error', text: 'Failed to load your custom prompts' });
        return;
      }

      // Initialize prompts object
      const promptsMap: Record<string, InvestorPrompt> = {};
      reportNames.forEach(name => {
        promptsMap[name] = { report_name: name, custom_prompt: null };
      });

      // Fill in existing prompts
      if (data) {
        data.forEach(prompt => {
          promptsMap[prompt.report_name] = {
            id: prompt.id,
            report_name: prompt.report_name,
            custom_prompt: prompt.custom_prompt,
          };
          // Set the text for display
          setPromptTexts(prev => ({
            ...prev,
            [prompt.report_name]: prompt.custom_prompt || '',
          }));
        });
      }

      setPrompts(promptsMap);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'An error occurred while loading prompts' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemPrompts = async () => {
    try {
      const systemPrompts = await Promise.all(
        reportNames.map(async (reportName) => {
          const { data } = await supabase
            .from('prompts')
            .select('prompt_detail')
            .eq('prompt_name', reportName)
            .maybeSingle();
          return { name: reportName, prompt: data?.prompt_detail || '' };
        })
      );

      // Store system prompts for reference
      systemPrompts.forEach(({ name, prompt }) => {
        // If user doesn't have custom prompt, show system prompt as placeholder
        if (!prompts[name]?.custom_prompt && !promptTexts[name]) {
          setPromptTexts(prev => ({
            ...prev,
            [name]: prev[name] || '', // Only update if empty
          }));
        }
      });
    } catch (error) {
      console.error('Error loading system prompts:', error);
    }
  };

  const handlePromptChange = (reportName: string, value: string) => {
    setPromptTexts(prev => ({
      ...prev,
      [reportName]: value,
    }));
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event: any) => {
          setRecordingPrompt((currentPrompt) => {
            if (!currentPrompt) return currentPrompt;
            
            // Get the base text that existed when recording started (from ref)
            const baseText = recordingBaseTextRef.current[currentPrompt] || '';
            
            // Reconstruct text from scratch using only final results + latest interim
            let allFinalText = '';
            let latestInterimText = '';
            
            // Collect all final results (these are confirmed)
            for (let i = 0; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                allFinalText += event.results[i][0].transcript + ' ';
              }
            }
            
            // Get the latest interim result (the most recent non-final)
            for (let i = event.results.length - 1; i >= 0; i--) {
              if (!event.results[i].isFinal) {
                latestInterimText = event.results[i][0].transcript;
                break;
              }
            }
            
            // Build the complete text: base + all final results + latest interim
            const completeText = (
              baseText + 
              (baseText && allFinalText ? ' ' : '') + 
              allFinalText.trim() + 
              (latestInterimText ? ' ' + latestInterimText : '')
            ).replace(/\s+/g, ' ').trim();
            
            // Update the prompt text
            setPromptTexts((prev) => ({
              ...prev,
              [currentPrompt]: completeText,
            }));
            
            return currentPrompt;
          });
        };
        
        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted') {
            // These are expected errors when stopping
            return;
          }
          setMessage({ type: 'error', text: `Speech recognition error: ${event.error}` });
          setRecordingPrompt(null);
        };
        
        recognitionInstance.onend = () => {
          setRecordingPrompt((currentPrompt) => {
            if (currentPrompt) {
              // Restart if still supposed to be recording
              try {
                recognitionInstance.start();
              } catch (error) {
                console.error('Error restarting recognition:', error);
              }
            }
            return currentPrompt;
          });
        };
        
        setRecognition(recognitionInstance);
      } else {
        // Speech recognition not supported
        console.log('Speech recognition not supported in this browser');
      }
    }
    
    return () => {
      // Cleanup will be handled by the recording state effect
    };
  }, []);

  // Handle recording state changes
  useEffect(() => {
    if (!recognition) return;
    
    if (recordingPrompt) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setMessage({ type: 'error', text: 'Failed to start recording' });
        setRecordingPrompt(null);
      }
    } else {
      try {
        recognition.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
    }
  }, [recordingPrompt, recognition]);

  const startRecording = (reportName: string) => {
    if (!recognition) {
      setMessage({ type: 'error', text: 'Speech recognition not available. Please use Chrome, Edge, or Safari.' });
      return;
    }
    
    // Store the current text as the base text before starting recording
    // This ensures we don't duplicate existing text when appending voice input
    recordingBaseTextRef.current[reportName] = promptTexts[reportName] || '';
    
    setRecordingPrompt(reportName);
    setMessage({ type: 'success', text: `Recording started for ${reportName.replace('-', ' ')}. Click again to stop.` });
    setTimeout(() => setMessage(null), 3000);
  };

  const stopRecording = () => {
    // Get current recording prompt before clearing it
    setRecordingPrompt((currentPrompt) => {
      if (currentPrompt) {
        // Clean up the text by removing any duplicate spaces and trimming
        setPromptTexts((prev) => {
          const currentText = prev[currentPrompt] || '';
          const cleanedText = currentText.replace(/\s+/g, ' ').trim();
          return {
            ...prev,
            [currentPrompt]: cleanedText,
          };
        });
        
        // Clear the base text for this prompt
        delete recordingBaseTextRef.current[currentPrompt];
      }
      return null;
    });
    setMessage({ type: 'success', text: 'Recording stopped' });
    setTimeout(() => setMessage(null), 2000);
  };

  const toggleRecording = (reportName: string) => {
    if (recordingPrompt === reportName) {
      stopRecording();
    } else {
      // Stop any other recording first
      if (recordingPrompt) {
        stopRecording();
        setTimeout(() => startRecording(reportName), 500);
      } else {
        startRecording(reportName);
      }
    }
  };

  const handleSavePrompt = async (reportName: string) => {
    const promptText = promptTexts[reportName]?.trim() || null;
    setSavingPrompts(prev => ({ ...prev, [reportName]: true }));
    setMessage(null);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      const existingPrompt = prompts[reportName];

      if (existingPrompt?.id) {
        // Update existing
        const { error } = await supabase
          .from('investor_prompts')
          .update({
            custom_prompt: promptText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPrompt.id);

        if (error) throw error;
      } else {
        // Insert new - only if promptText is not null
        if (promptText) {
          const { error } = await supabase
            .from('investor_prompts')
            .insert({
              user_id: currentUser.id,
              report_name: reportName,
              custom_prompt: promptText,
            });

          if (error) throw error;
        } else {
          // If empty and no existing record, do nothing (don't create NULL entry)
          setSavingPrompts(prev => ({ ...prev, [reportName]: false }));
          return;
        }
      }

      // Reload prompts to get updated data
      await loadPrompts();
      
      setMessage({ 
        type: 'success', 
        text: `${reportName} prompt ${existingPrompt?.id ? 'updated' : 'saved'} successfully!` 
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to save ${reportName} prompt: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setSavingPrompts(prev => ({ ...prev, [reportName]: false }));
    }
  };

  const handleClearPrompt = async (reportName: string) => {
    const existingPrompt = prompts[reportName];
    
    if (!existingPrompt?.id) {
      // No record exists, just clear the text
      setPromptTexts(prev => ({
        ...prev,
        [reportName]: '',
      }));
      return;
    }

    // Delete the record
    setSavingPrompts(prev => ({ ...prev, [reportName]: true }));
    
    try {
      const { error } = await supabase
        .from('investor_prompts')
        .delete()
        .eq('id', existingPrompt.id);

      if (error) throw error;

      setPromptTexts(prev => ({
        ...prev,
        [reportName]: '',
      }));

      await loadPrompts();
      
      setMessage({ 
        type: 'success', 
        text: `${reportName} custom prompt cleared. System prompt will be used.` 
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error clearing prompt:', error);
      setMessage({ type: 'error', text: 'Failed to clear prompt' });
    } finally {
      setSavingPrompts(prev => ({ ...prev, [reportName]: false }));
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-navy-950' : 'bg-silver-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-silver-300' : 'text-navy-700'}`}>Loading prompts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-navy-950' : 'bg-silver-50'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                Pitch Fork
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>
                Dashboard
              </Link>
              
              {/* Utilities Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUtilitiesMenu(!showUtilitiesMenu)}
                  className={`flex items-center ${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}
                >
                  Utilities <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {showUtilitiesMenu && (
                  <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                    <Link to="/investor-preferences" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                      Investor Preferences
                    </Link>
                    <Link to="/edit-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                      Edit Prompts
                    </Link>
                    <Link to="/investor-prompts" className={`block px-4 py-2 text-sm text-gold-600 font-bold bg-gold-50 dark:bg-gold-900/20`}>
                      Investor Prompts
                    </Link>
                  </div>
                )}
              </div>
              
              <Link to="/help" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>Help</Link>
              
              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center ${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}
                >
                  <User className="w-4 h-4 mr-1" />
                  User <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {showUserMenu && (
                  <div className={`absolute top-full right-0 mt-2 w-32 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                    <Link to="/account" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                      Account
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            
            {/* Back to Dashboard */}
            <Link 
              to="/dashboard" 
              className={`flex items-center px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm font-semibold`}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
          </div>
        </div>
        
        {/* Click outside handler for dropdowns */}
        {(showUserMenu || showUtilitiesMenu) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowUserMenu(false);
              setShowUtilitiesMenu(false);
            }}
          />
        )}
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-4">
            Investor Prompts
          </h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
            Customize your analysis prompts for Product, Market, Team, and Financial analyses. 
            If you don't set a custom prompt, the system default will be used.
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-300' 
              : 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-300'
          }`}>
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              {message.text}
            </div>
          </div>
        )}

        {/* Prompts List */}
        <div className="space-y-6">
          {reportNames.map((reportName) => {
            const hasCustomPrompt = prompts[reportName]?.custom_prompt !== null;
            const promptText = promptTexts[reportName] || '';
            const isSaving = savingPrompts[reportName] || false;

            return (
              <div
                key={reportName}
                className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border`}
              >
                <div className="p-6 border-b border-silver-200 dark:border-navy-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-6 h-6 text-gold-600 mr-3" />
                      <h2 className="text-2xl font-bold text-gold-600">
                        {reportName.replace('-', ' ')}
                      </h2>
                      {hasCustomPrompt && (
                        <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-semibold">
                          Custom Prompt Active
                        </span>
                      )}
                    </div>
                    {hasCustomPrompt && (
                      <button
                        onClick={() => handleClearPrompt(reportName)}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isSaving
                            ? 'opacity-50 cursor-not-allowed'
                            : isDark
                              ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        Clear Custom Prompt
                      </button>
                    )}
                  </div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-silver-400' : 'text-slate-600'}`}>
                    {hasCustomPrompt 
                      ? 'Your custom prompt will be used for this analysis type. Reports will indicate that a custom prompt was used.'
                      : 'No custom prompt set. The system default prompt will be used.'}
                  </p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'}`}>
                      Custom Prompt Text
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleRecording(reportName)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        recordingPrompt === reportName
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : isDark
                            ? 'bg-navy-700 text-silver-300 hover:bg-navy-600'
                            : 'bg-silver-100 text-navy-700 hover:bg-silver-200'
                      }`}
                      title={recordingPrompt === reportName ? 'Stop recording' : 'Start voice input'}
                    >
                      <Mic className={`w-4 h-4 ${recordingPrompt === reportName ? 'animate-pulse' : ''}`} />
                      {recordingPrompt === reportName ? 'Stop' : 'Record'}
                    </button>
                  </div>
                  <textarea
                    value={promptText}
                    onChange={(e) => handlePromptChange(reportName, e.target.value)}
                    placeholder={hasCustomPrompt 
                      ? 'Enter your custom prompt...' 
                      : 'Leave empty to use system default. Enter custom prompt to override...'}
                    rows={12}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors font-mono text-sm ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                        : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                    }`}
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSavePrompt(reportName)}
                      disabled={isSaving}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center ${
                        isSaving
                          ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                          : 'bg-gold-gradient text-white hover:shadow-gold shadow-financial'
                      }`}
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {isSaving ? 'Saving...' : promptText.trim() ? 'Save Prompt' : 'Clear & Use Default'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className={`mt-8 p-6 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            How Custom Prompts Work
          </h3>
          <ul className={`space-y-2 text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
            <li>• When you create a custom prompt, it will be used instead of the system default for that analysis type</li>
            <li>• Reports generated with your custom prompt will clearly indicate "Custom Prompt Used - Investor: [Your Name]" at the top</li>
            <li>• You can clear a custom prompt at any time to revert to the system default</li>
            <li>• Custom prompts are only used for your analyses - other investors will use their own prompts or system defaults</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvestorPrompts;

