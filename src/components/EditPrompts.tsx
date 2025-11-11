import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard as Edit3, Trash2, Save, X, User, ChevronDown, MessageSquare, Brain, Sparkles } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface EditPromptsProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface Prompt {
  id: string;
  prompt_name: string;
  prompt_detail: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const EditPrompts: React.FC<EditPromptsProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    prompt_name: '',
    prompt_detail: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [llmPreference, setLlmPreference] = useState<'OpenAI' | 'Claude'>('OpenAI');
  const [isSavingLlmPreference, setIsSavingLlmPreference] = useState(false);

  const llmOptions = ['GPT-4', 'GPT-3.5', 'Claude-3', 'Claude-2', 'Gemini-Pro'];

  // Check authentication and load prompts
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      await loadPrompts();
      await loadLlmPreference(currentUser.id);
    };
    
    checkAuthAndLoadData();
  }, [navigate]);

  const loadLlmPreference = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('llm_preferences')
        .select('preferred_llm')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading LLM preference:', error);
        return;
      }

      if (data) {
        setLlmPreference(data.preferred_llm as 'OpenAI' | 'Claude');
      } else {
        // No preference found, use default
        setLlmPreference('OpenAI');
      }
    } catch (error) {
      console.error('Error loading LLM preference:', error);
    }
  };

  const handleSaveLlmPreference = async (newPreference: 'OpenAI' | 'Claude') => {
    if (!user) return;

    try {
      setIsSavingLlmPreference(true);
      
      // Check if preference already exists
      const { data: existingPreference, error: checkError } = await supabase
        .from('llm_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking LLM preference:', checkError);
        setMessage({ type: 'error', text: `Failed to save LLM preference: ${checkError.message}` });
        return;
      }

      let error;
      if (existingPreference?.id) {
        // Update existing preference
        const { error: updateError } = await supabase
          .from('llm_preferences')
          .update({
            preferred_llm: newPreference,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new preference
        const { error: insertError } = await supabase
          .from('llm_preferences')
          .insert({
            user_id: user.id,
            preferred_llm: newPreference,
          });
        error = insertError;
      }

      if (error) {
        console.error('Error saving LLM preference:', error);
        setMessage({ type: 'error', text: `Failed to save LLM preference: ${error.message || 'Unknown error'}` });
        return;
      }

      setLlmPreference(newPreference);
      setMessage({ type: 'success', text: `LLM preference saved: ${newPreference}` });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving LLM preference:', error);
      setMessage({ type: 'error', text: `Failed to save LLM preference: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSavingLlmPreference(false);
    }
  };

  const loadPrompts = async () => {
    try {
      setIsLoadingPrompts(true);
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading prompts:', error);
        setMessage({ type: 'error', text: 'Failed to load prompts' });
        return;
      }

      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setMessage({ type: 'error', text: 'Failed to load prompts' });
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleAddPrompt = async () => {
    if (!newPrompt.prompt_name.trim() || !newPrompt.prompt_detail.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('prompts')
        .insert([newPrompt])
        .select()
        .single();

      if (error) {
        console.error('Error adding prompt:', error);
        setMessage({ type: 'error', text: 'Failed to add prompt' });
        return;
      }

      setPrompts(prev => [data, ...prev]);
      setNewPrompt({ prompt_name: '', prompt_detail: '', description: '' });
      setShowAddForm(false);
      setMessage({ type: 'success', text: 'Prompt added successfully' });
    } catch (error) {
      console.error('Error adding prompt:', error);
      setMessage({ type: 'error', text: 'Failed to add prompt' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('prompts')
        .update({
          prompt_name: editingPrompt.prompt_name,
          prompt_detail: editingPrompt.prompt_detail,
          description: editingPrompt.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPrompt.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating prompt:', error);
        setMessage({ type: 'error', text: 'Failed to update prompt' });
        return;
      }

      setPrompts(prev => prev.map(p => p.id === data.id ? data : p));
      setEditingPrompt(null);
      setMessage({ type: 'success', text: 'Prompt updated successfully' });
    } catch (error) {
      console.error('Error updating prompt:', error);
      setMessage({ type: 'error', text: 'Failed to update prompt' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrompt = async (prompt: Prompt) => {
    if (!confirm(`Are you sure you want to delete "${prompt.prompt_name}"?`)) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', prompt.id);

      if (error) {
        console.error('Error deleting prompt:', error);
        setMessage({ type: 'error', text: 'Failed to delete prompt' });
        return;
      }

      setPrompts(prev => prev.filter(p => p.id !== prompt.id));
      setMessage({ type: 'success', text: 'Prompt deleted successfully' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setMessage({ type: 'error', text: 'Failed to delete prompt' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/');
    }
  };

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-navy-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                Pitch Fork
              </div>
            </div>
            
            <div className="flex items-center space-x-4 ml-auto">
              {/* Navigation Menu */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>Dashboard</Link>
                
                {/* Preferences Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
                    className={`flex items-center text-gold-600 font-bold transition-colors`}
                  >
                    Preferences <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showPreferencesMenu && (
                    <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                      <Link to="/investor-preferences" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                        Screening Criteria
                      </Link>
                      <Link to="/investor-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                        Custom Analysis Prompts
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Admin Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`flex items-center text-gold-600 font-bold transition-colors`}
                  >
                    Admin <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showAdminMenu && (
                    <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                      <Link to="/edit-prompts" className={`block px-4 py-2 text-sm text-gold-600 font-bold bg-gold-50 dark:bg-gold-900/20`}>
                        Default Analysis Prompts
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
              </nav>
              
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
        </div>
        
        {/* Click outside handler for dropdowns */}
        {(showUserMenu || showPreferencesMenu || showAdminMenu) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowUserMenu(false);
              setShowPreferencesMenu(false);
              setShowAdminMenu(false);
            }}
          />
        )}
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-4">Edit Prompts</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
            Manage AI prompts for investment analysis and company evaluation
          </p>
        </div>

        {/* LLM Preference Selector Section */}
        <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border mb-8`}>
          <div className="p-6 border-b border-silver-200 dark:border-navy-700">
            <h2 className="text-2xl font-bold text-gold-600 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Preferred LLM Provider
            </h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
              Choose which LLM to use for analysis. This preference will be used for all analysis functions.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSaveLlmPreference('OpenAI')}
                disabled={isSavingLlmPreference}
                className={`p-4 rounded-lg border-2 transition-all ${
                  llmPreference === 'OpenAI'
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : isDark
                    ? 'border-navy-600 bg-navy-700 hover:border-navy-500'
                    : 'border-silver-300 bg-silver-50 hover:border-silver-400'
                } ${isSavingLlmPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className={`w-6 h-6 ${llmPreference === 'OpenAI' ? 'text-gold-600' : isDark ? 'text-silver-400' : 'text-navy-600'}`} />
                  <div>
                    <div className={`font-bold text-left ${llmPreference === 'OpenAI' ? 'text-gold-600' : isDark ? 'text-silver-300' : 'text-navy-900'}`}>
                      OpenAI
                    </div>
                    <div className={`text-xs mt-1 text-left ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
                      GPT-4, GPT-3.5
                    </div>
                  </div>
                </div>
                {llmPreference === 'OpenAI' && (
                  <div className="mt-2 text-xs text-gold-600 font-semibold text-left">✓ Selected</div>
                )}
              </button>

              <button
                onClick={() => handleSaveLlmPreference('Claude')}
                disabled={isSavingLlmPreference}
                className={`p-4 rounded-lg border-2 transition-all ${
                  llmPreference === 'Claude'
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : isDark
                    ? 'border-navy-600 bg-navy-700 hover:border-navy-500'
                    : 'border-silver-300 bg-silver-50 hover:border-silver-400'
                } ${isSavingLlmPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3">
                  <Brain className={`w-6 h-6 ${llmPreference === 'Claude' ? 'text-gold-600' : isDark ? 'text-silver-400' : 'text-navy-600'}`} />
                  <div>
                    <div className={`font-bold text-left ${llmPreference === 'Claude' ? 'text-gold-600' : isDark ? 'text-silver-300' : 'text-navy-900'}`}>
                      Claude
                    </div>
                    <div className={`text-xs mt-1 text-left ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
                      Claude 3.5 Sonnet
                    </div>
                  </div>
                </div>
                {llmPreference === 'Claude' && (
                  <div className="mt-2 text-xs text-gold-600 font-semibold text-left">✓ Selected</div>
                )}
              </button>
            </div>
            {isSavingLlmPreference && (
              <div className={`mt-4 text-sm text-center ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
                Saving preference...
              </div>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-success-100 border-success-400 text-success-700' 
              : 'bg-danger-100 border-danger-400 text-danger-700'
          }`}>
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              {message.text}
            </div>
          </div>
        )}

        {/* Add New Prompt Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gold-gradient text-white px-6 py-3 rounded-lg font-bold hover:shadow-gold focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 transition-all duration-300 shadow-financial flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Prompt
          </button>
        </div>

        {/* Add New Prompt Form */}
        {showAddForm && (
          <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border mb-8`}>
            <div className="p-6 border-b border-silver-200 dark:border-navy-700">
              <h2 className="text-2xl font-bold text-gold-600 flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Add New Prompt
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                    Prompt Name *
                  </label>
                  <input
                    type="text"
                    value={newPrompt.prompt_name}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_name: e.target.value }))}
                    placeholder="Enter prompt name"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                        : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={newPrompt.description}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the prompt's purpose"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                        : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                    Prompt Detail *
                  </label>
                  <textarea
                    value={newPrompt.prompt_detail}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_detail: e.target.value }))}
                    placeholder="Enter detailed prompt instructions"
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                        : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                    }`}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddPrompt}
                    disabled={isLoading}
                    className="bg-success-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Adding...' : 'Add Prompt'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPrompt({ prompt_name: '', prompt_detail: '', description: '' });
                    }}
                    className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                      isDark 
                        ? 'bg-navy-600 text-silver-300 hover:bg-navy-500' 
                        : 'bg-silver-200 text-navy-700 hover:bg-silver-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prompts List */}
        <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border`}>
          <div className="p-6 border-b border-silver-200 dark:border-navy-700">
            <h2 className="text-2xl font-bold text-gold-600 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              AI Prompts
            </h2>
          </div>
          <div className="p-6">
            {isLoadingPrompts ? (
              <div className="text-center py-8">
                <div className="text-silver-500">Loading prompts...</div>
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-navy-600' : 'text-silver-400'}`} />
                <div className={`${isDark ? 'text-silver-400' : 'text-navy-500'}`}>No prompts found</div>
              </div>
            ) : (
              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className={`p-6 rounded-xl border ${isDark ? 'border-navy-600 bg-navy-700' : 'border-silver-200 bg-silver-50'} hover:shadow-gold transition-all duration-300`}>
                    {editingPrompt?.id === prompt.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                            Prompt Name
                          </label>
                          <input
                            type="text"
                            value={editingPrompt.prompt_name}
                            onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, prompt_name: e.target.value } : null)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                              isDark 
                                ? 'bg-navy-600 border-navy-500 text-white' 
                                : 'bg-white border-silver-300 text-navy-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={editingPrompt.description || ''}
                            onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, description: e.target.value } : null)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                              isDark 
                                ? 'bg-navy-600 border-navy-500 text-white' 
                                : 'bg-white border-silver-300 text-navy-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                            Prompt Detail
                          </label>
                          <textarea
                            value={editingPrompt.prompt_detail}
                            onChange={(e) => setEditingPrompt(prev => prev ? { ...prev, prompt_detail: e.target.value } : null)}
                            rows={4}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                              isDark 
                                ? 'bg-navy-600 border-navy-500 text-white' 
                                : 'bg-white border-silver-300 text-navy-900'
                            }`}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdatePrompt}
                            disabled={isLoading}
                            className="bg-success-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-success-700 transition-colors disabled:opacity-50 flex items-center"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPrompt(null)}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                              isDark 
                                ? 'bg-navy-600 text-silver-300 hover:bg-navy-500' 
                                : 'bg-silver-200 text-navy-700 hover:bg-silver-300'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xl font-bold text-gold-600">{prompt.prompt_name}</h3>
                          </div>
                          <p className={`text-sm ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-3 leading-relaxed`}>
                            {prompt.prompt_detail}
                          </p>
                          {prompt.description && (
                            <p className={`text-sm ${isDark ? 'text-silver-400' : 'text-slate-500'} mb-3 italic`}>
                              {prompt.description}
                            </p>
                          )}
                          <p className={`text-xs ${isDark ? 'text-silver-400' : 'text-slate-500'}`}>
                            Created: {new Date(prompt.created_at).toLocaleDateString()} • 
                            Updated: {new Date(prompt.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => setEditingPrompt(prompt)}
                            className="p-2 text-gold-600 hover:bg-gold-100 dark:hover:bg-gold-900/20 rounded transition-colors"
                            title="Edit prompt"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(prompt)}
                            className="p-2 text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-900/20 rounded transition-colors"
                            title="Delete prompt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-12 ${isDark ? 'bg-navy-900' : 'bg-navy-950'} text-white mt-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-4">
                Pitch Fork
              </div>
              <p className="text-silver-300 leading-relaxed">
                Empowering investors with AI-driven analysis for smarter investment decisions.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-gold-400">Contact</h4>
              <p className="text-silver-300 mb-2">hello@pitchfork.com</p>
              <p className="text-silver-300">+1 (555) 123-4567</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-gold-400">Product</h4>
              <ul className="space-y-2 text-silver-300">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-gold-400">Legal</h4>
              <ul className="space-y-2 text-silver-300">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-navy-700 pt-8 text-center text-silver-400">
            <p>&copy; 2025 Pitch Fork. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EditPrompts;