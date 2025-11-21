import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Save, User, ChevronDown, Upload, FileText, X, Sparkles } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';
import SectorTree from './SectorTree';

interface EditCompanyProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  address?: string;
  country?: string;
  contact_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  description?: string;
  funding_terms?: string;
  created_at: string;
  status?: string;
  date_submitted?: string;
  overall_score?: number;
  recommendation?: string;
  revenue?: string;
  valuation?: string;
  url?: string;
  industry_sectors?: Array<{sector: string, sub_sector: string}>;
  geography?: string;
  investment_round?: number;
  terms?: string;
  extracted_text?: string;
}

const EditCompany: React.FC<EditCompanyProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractErrors, setExtractErrors] = useState<string[]>([]);

  // Check authentication and load company data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Check user type
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      setIsFounder(profile?.user_type === 'founder');

      // Check if company data was passed via navigation state
      if (location.state?.company) {
        const companyData = location.state.company;
        console.log('Company data received from navigation:', companyData);
        
        // Map company data to match EditCompany's expected structure
        const mappedCompanyData = {
          ...companyData,
          // Map email_1 to email if email doesn't exist
          email: companyData.email || companyData.email_1 || '',
          // Map phone_1 to phone if phone doesn't exist
          phone: companyData.phone || companyData.phone_1 || '',
          // Map contact_name_1 to contact_name if contact_name doesn't exist
          contact_name: companyData.contact_name || companyData.contact_name_1 || '',
          // Map funding_terms to funding_terms (same name)
          funding_terms: companyData.funding_terms || companyData.funding_sought || '',
        };
        
        setCompany(mappedCompanyData);
        setFormData(mappedCompanyData);
        setIsLoadingCompany(false);

        // Load documents for this company (don't await - let it run in background)
        loadDocuments(mappedCompanyData.id).catch(error => {
          console.error('Error loading documents:', error);
          // Don't fail the whole component if documents fail to load
        });
      } else {
        // Load company data from database (for investors)
        await loadCompanyData();
      }
    };

    checkAuthAndLoadData();
  }, [navigate, location.state]);

  const loadCompanyData = async () => {
    try {
      setIsLoadingCompany(true);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessage({ type: 'error', text: 'User not authenticated' });
        setIsLoadingCompany(false);
        return;
      }

      // Check if user is a founder
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profile?.user_type === 'founder') {
        // Load founder's company
        const { data: companyData, error } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading company:', error);
          setMessage({ type: 'error', text: 'Failed to load company data' });
          setIsLoadingCompany(false);
          return;
        }

        if (!companyData) {
          setMessage({ type: 'error', text: 'No company found for your account' });
          setIsLoadingCompany(false);
          return;
        }

        setCompany(companyData);
        setFormData(companyData);
        await loadDocuments(companyData.id);
      setExtractErrors([]);
      } else {
        // For investors, show message that no company was selected
        setMessage({ type: 'error', text: 'No company selected for editing' });
      }

      setIsLoadingCompany(false);
    } catch (error) {
      console.error('Error loading company:', error);
      setMessage({ type: 'error', text: 'Failed to load company data' });
      setIsLoadingCompany(false);
    }
  };
  const handleExtractText = async () => {
    if (!company) {
      setMessage({ type: 'error', text: 'No company data available for extraction.' });
      return;
    }

    try {
      setIsExtracting(true);
      setMessage(null);
      setExtractErrors([]);

      const { data, error } = await supabase.functions.invoke('extract-company-text', {
        body: { company_id: company.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const extractedText = typeof data?.extracted_text === 'string' ? data.extracted_text : '';

      setCompany((prev) => (prev ? { ...prev, extracted_text: extractedText } : prev));

      const responseMessage =
        typeof data?.message === 'string' && data.message.length > 0
          ? data.message
          : 'Document text extracted successfully.';

      setMessage({ type: 'success', text: responseMessage });

      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        setExtractErrors(
          data.errors
            .map((item: any) => {
              if (!item) return null;
              const path = typeof item.path === 'string' ? item.path : 'Unknown file';
              const details = typeof item.error === 'string' ? item.error : 'Unknown error';
              return `${path}: ${details}`;
            })
            .filter(Boolean) as string[]
        );
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to extract document text.',
      });
    } finally {
      setIsExtracting(false);
    }
  };


  const loadDocuments = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        // Don't fail - just log the error
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      // Don't fail - just log the error
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAdditionalFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!company || additionalFiles.length === 0) {
      return;
    }

    try {
      setIsUploadingFiles(true);

      for (const file of additionalFiles) {
        const filePath = `${company.id}/${file.name}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('company-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          setMessage({ type: 'error', text: `Failed to upload ${file.name}` });
          continue;
        }

        // Save document record
        const { error: docError } = await supabase
          .from('documents')
          .insert([{
            company_id: company.id,
            filename: file.name,
            document_name: file.name.replace(/\.[^/.]+$/, ''),
            description: '',
            path: filePath
          }]);

        if (docError) {
          console.error('Error saving document record:', docError);
        }
      }

      // Reload documents
      await loadDocuments(company.id);
      setAdditionalFiles([]);
      setMessage({ type: 'success', text: 'Files uploaded successfully!' });
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage({ type: 'error', text: 'Failed to upload files' });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company) {
      setMessage({ type: 'error', text: 'No company data to save' });
      return;
    }

    if (!formData.name?.trim()) {
      setMessage({ type: 'error', text: 'Company name is required' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', company.id);

      if (error) {
        console.error('Error updating company:', error);
        setMessage({ type: 'error', text: 'Failed to update company information' });
        return;
      }

      setMessage({ type: 'success', text: 'Company information submitted successfully!' });

      // Update local state
      setCompany(prev => prev ? { ...prev, ...formData } : null);

      // Redirect based on user type
      setTimeout(() => {
        if (isFounder) {
          // Redirect to investor selection for founders
          navigate('/investor-selection', { state: { companyId: company.id } });
        } else {
          // Always redirect to dashboard for investors
          navigate('/dashboard');
        }
      }, 1500);

    } catch (error) {
      console.error('Error updating company:', error);
      setMessage({ type: 'error', text: 'Failed to update company information' });
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

  if (isLoadingCompany) {
    return (
      <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading company data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-navy-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="PitchFork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                PitchFork
              </div>
            </div>
            
            <div className="flex items-center space-x-4 ml-auto">
              {/* Navigation Menu - Only show for investors */}
              {!isFounder && (
                <nav className="hidden md:flex items-center space-x-6">
                  <Link to="/dashboard" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>Dashboard</Link>

                  {/* Preferences Dropdown - Only show for investors */}
                  {!isFounder && (
                    <>
                      <div className="relative">
                        <button
                          onClick={() => setShowPreferencesMenu(!showPreferencesMenu)}
                          className={`flex items-center ${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}
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
                      
                      {/* Admin Dropdown - Only show for investors */}
                      <div className="relative">
                        <button
                          onClick={() => setShowAdminMenu(!showAdminMenu)}
                          className={`flex items-center ${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}
                        >
                          Admin <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        {showAdminMenu && (
                          <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                            <Link to="/edit-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                              Default Analysis Prompts
                            </Link>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Link to="/help" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>Help</Link>

                  {/* User Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                    >
                      <User className="w-4 h-4 mr-1" />
                      User <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    {showUserMenu && (
                      <div className={`absolute top-full right-0 mt-2 w-32 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} z-50`}>
                        <Link to="/account" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                          Account
                        </Link>
                        <button
                          onClick={handleLogout}
                          className={`w-full text-left px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </nav>
              )}

              {/* Founder Navigation - Simple user menu */}
              {isFounder && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                  >
                    <User className="w-4 h-4 mr-1" />
                    User <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showUserMenu && (
                    <div className={`absolute top-full right-0 mt-2 w-32 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} z-50`}>
                      <button
                        onClick={handleLogout}
                        className={`w-full text-left px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              
              {/* Back to Dashboard */}
              <Link
                to={isFounder ? "/founder-dashboard" : "/dashboard"}
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Complete Your Company Information</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {company ? `Please review and complete the information for ${company.name}` : 'Complete your company information'}
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-100 border-green-400 text-green-700' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Company Form */}
        {company ? (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-blue-600 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Company Information
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Industry
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., Technology, Healthcare"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      placeholder="Company address"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country || ''}
                      onChange={handleInputChange}
                      placeholder="Country"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  {/* Primary Contact */}
                  <div className="md:col-span-2">
                    <h4 className="font-medium mb-2">Primary Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="contact_name"
                        value={formData.contact_name || ''}
                        onChange={handleInputChange}
                        placeholder="Contact name"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleInputChange}
                        placeholder="Title"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        placeholder="Email"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleInputChange}
                        placeholder="Phone"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* Description and Funding */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Company Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      placeholder="Brief description of the company"
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Funding Sought
                    </label>
                    <input
                      type="text"
                      name="funding_terms"
                      value={formData.funding_terms || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., $500K Series A"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Revenue
                    </label>
                    <input
                      type="text"
                      name="revenue"
                      value={formData.revenue || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., $1M ARR"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Valuation
                    </label>
                    <input
                      type="text"
                      name="valuation"
                      value={formData.valuation || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., $10M"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Website URL
                    </label>
                    <input
                      type="url"
                      name="url"
                      value={formData.url || ''}
                      onChange={handleInputChange}
                      placeholder="https://yourcompany.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Matching Criteria Section */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-300 dark:border-gray-700">
                    <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      Matching Criteria
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      These fields help match your company with compatible investors
                    </p>

                    {/* Industry Sectors */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Industry Sectors & Sub-Sectors
                      </label>
                      <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Select one or more sectors and sub-sectors that match your company
                      </p>
                      <SectorTree
                        selectedSectors={formData.industry_sectors || []}
                        onChange={(selected) => setFormData(prev => ({ ...prev, industry_sectors: selected }))}
                        isDark={isDark}
                        multiSelect={true}
                      />
                    </div>

                    {/* Geography */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Geography
                      </label>
                      <select
                        name="geography"
                        value={formData.geography || 'US'}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="US">US</option>
                        <option value="Europe">Europe</option>
                        <option value="India">India</option>
                      </select>
                    </div>

                    {/* Investment Round */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Investment Round Amount
                      </label>
                      <input
                        type="number"
                        name="investment_round"
                        value={formData.investment_round || ''}
                        onChange={handleNumberChange}
                        placeholder="3000000"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Enter amount in dollars (e.g., 3000000 for $3M)
                      </p>
                    </div>

                    {/* Terms */}
                    <div className="mb-4">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Investment Terms
                      </label>
                      <textarea
                        name="terms"
                        value={formData.terms || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., $2.5M SAFE at a 20% Discount and $16M Post Money Cap"
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 text-blue-600">Documents</h3>

                    {/* Existing Documents */}
                    {documents.length > 0 && (
                      <div className="mb-4">
                        <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Uploaded Documents
                        </h4>
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div
                              key={doc.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{doc.document_name}</p>
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {doc.filename}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add More Files */}
                    <div>
                      <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Add More Documents
                      </h4>
                      <div className="mb-3">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="additional-files"
                        />
                        <label
                          htmlFor="additional-files"
                          className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                            isDark
                              ? 'border-gray-600 hover:border-blue-500 bg-gray-700'
                              : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                          }`}
                        >
                          <Upload className="w-5 h-5 mr-2 text-blue-600" />
                          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                            Click to select files
                          </span>
                        </label>
                      </div>

                      {/* Selected Files for Upload */}
                      {additionalFiles.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {additionalFiles.map((file, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-2 rounded border ${
                                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                              }`}
                            >
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleUploadFiles}
                            disabled={isUploadingFiles}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isUploadingFiles ? 'Uploading...' : 'Upload Files'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Submitting...' : 'Submit Company Information'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExtractText}
                    disabled={isExtracting || !company}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isExtracting ? 'Extracting...' : 'Extract Text'}
                  </button>
                </div>
                {extractErrors.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-800">
                    <h4 className="font-semibold mb-2">Some documents could not be processed:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {extractErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {company?.extracted_text && company.extracted_text.trim().length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 text-blue-600">Extracted Text Preview</h3>
                    <div
                      className={`max-h-64 overflow-y-auto p-4 rounded-lg border text-sm ${
                        isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap break-words">
                        {company.extracted_text.substring(0, 5000)}
                        {company.extracted_text.length > 5000 ? '…' : ''}
                      </pre>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 text-center`}>
            <Building2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-xl font-semibold mb-2">No Company Selected</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
              Please select a company from the dashboard to edit its information.
            </p>
            <Link
              to={isFounder ? "/founder-dashboard" : "/dashboard"}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className={`py-8 ${isDark ? 'bg-gray-800' : 'bg-gray-900'} text-white mt-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-xl font-bold text-blue-400 mb-3">
                PitchFork
              </div>
              <p className="text-gray-300">
                Empowering investors with AI-driven analysis for smarter investment decisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <p className="text-gray-300">hello@pitchfork.com</p>
              <p className="text-gray-300">+1 (555) 123-4567</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-6 text-center text-gray-300">
            <p>&copy; 2025 PitchFork. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EditCompany;