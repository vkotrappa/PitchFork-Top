import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Building2, FileText, CheckCircle, AlertCircle, User, ChevronDown, Plus } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface SubmitFilesProps {
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
  revenue?: string;
  valuation?: string;
  url?: string;
}

const SubmitFiles: React.FC<SubmitFilesProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    industry: '',
    address: '',
    country: '',
    contact_name: '',
    title: '',
    email: '',
    phone: '',
    description: '',
    funding_terms: '',
    revenue: '',
    valuation: '',
    url: ''
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<{[key: string]: {name: string, description: string}}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Check authentication and load companies
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      await loadCompanies();
    };
    
    checkAuthAndLoadData();
  }, [navigate]);

  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading companies:', error);
        setMessage({ type: 'error', text: 'Failed to load companies' });
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setMessage({ type: 'error', text: 'Failed to load companies' });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'add-new') {
      setShowAddCompany(true);
      setSelectedCompany(null);
    } else if (value === '') {
      setSelectedCompany(null);
      setShowAddCompany(false);
    } else {
      const company = companies.find(c => c.id === value);
      setSelectedCompany(company || null);
      setShowAddCompany(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a company name' });
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if company already exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', newCompanyData.name.trim())
        .maybeSingle();

      if (existingCompany) {
        setSelectedCompany(existingCompany);
        setShowAddCompany(false);
        setNewCompanyData({
          name: '',
          industry: '',
          address: '',
          country: '',
          contact_name: '',
          title: '',
          email: '',
          phone: '',
          description: '',
          funding_terms: '',
          revenue: '',
          valuation: '',
          url: ''
        });
        setMessage({ type: 'success', text: 'Company already exists and has been selected' });
        return;
      }

      // Insert new company
      const { data, error } = await supabase
        .from('companies')
        .insert([{ ...newCompanyData, user_id: user?.id }])
        .select()
        .single();

      if (error) {
        console.error('Error adding company:', error);
        setMessage({ type: 'error', text: 'Failed to add company' });
        return;
      }

      setSelectedCompany(data);
      setCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddCompany(false);
      setNewCompanyData({
        name: '',
        industry: '',
        address: '',
        country: '',
        contact_name: '',
        title: '',
        email: '',
        phone: '',
        description: '',
        funding_terms: '',
        key_team_members: '',
        revenue: '',
        valuation: '',
        url: ''
      });
      setMessage({ type: 'success', text: 'Company added successfully' });
    } catch (error) {
      console.error('Error adding company:', error);
      setMessage({ type: 'error', text: 'Failed to add company' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    
    // Initialize metadata for new files
    if (e.target.files) {
      const newMetadata: {[key: string]: {name: string, description: string}} = {};
      Array.from(e.target.files).forEach(file => {
        newMetadata[file.name] = {
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for default name
          description: ''
        };
      });
      setDocumentMetadata(newMetadata);
    }
  };

  const handleMetadataChange = (filename: string, field: 'name' | 'description', value: string) => {
    setDocumentMetadata(prev => ({
      ...prev,
      [filename]: {
        ...prev[filename],
        [field]: value
      }
    }));
  };

  const handleFileUpload = async () => {
    if (!selectedCompany) {
      setMessage({ type: 'error', text: 'Please select a company first' });
      return;
    }

    if (!files || files.length === 0) {
      setMessage({ type: 'error', text: 'Please select files to upload' });
      return;
    }

    try {
      setIsLoading(true);
      const uploadPromises = [];
      const documentRecords = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${selectedCompany.id}/${file.name}`;
        const metadata = documentMetadata[file.name] || { name: file.name, description: '' };

        // Upload file to Supabase Storage
        const uploadPromise = supabase.storage
          .from('company-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        uploadPromises.push(uploadPromise);
        documentRecords.push({
          company_id: selectedCompany.id,
          filename: file.name,
          document_name: metadata.name,
          description: metadata.description,
          path: filePath
        });
      }

      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);
      
      // Check for upload errors
      const failedUploads = uploadResults.filter(result => result.error);
      if (failedUploads.length > 0) {
        console.error('Upload errors:', failedUploads);
        setMessage({ type: 'error', text: `Failed to upload ${failedUploads.length} file(s)` });
        return;
      }

      // Insert document records into database
      const { error: dbError } = await supabase
        .from('documents')
        .insert(documentRecords);

      if (dbError) {
        console.error('Database error:', dbError);
        setMessage({ type: 'error', text: 'Failed to save document records' });
        return;
      }

      setMessage({ type: 'success', text: 'Files uploaded successfully!' });
      setFiles(null);
      setDocumentMetadata({});
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload files' });
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

  const allowedFileTypes = '.pdf,.ppt,.pptx,.xls,.xlsx';

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
                    className={`flex items-center ${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}
                  >
                    Preferences <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showPreferencesMenu && (
                    <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-lg shadow-financial border z-50`}>
                      <Link to="/investor-preferences" className={`block px-4 py-2 text-sm ${isDark ? 'text-silver-300 hover:bg-navy-700' : 'text-navy-700 hover:bg-silver-50'} transition-colors font-semibold`}>
                        Investor Preferences
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
              
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              
              {/* Back to Dashboard */}
              <Link 
                to="/dashboard" 
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
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Submit Files</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload company documents for analysis
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-100 border-green-400 text-green-700' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Company Selection Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-blue-600 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Company Selection
            </h2>
          </div>
          <div className="p-6">
            {/* Company Dropdown */}
            <div className="mb-4">
              <label htmlFor="company-select" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Select Company
              </label>
              <select
                id="company-select"
                onChange={handleCompanySelect}
                value={selectedCompany?.id || ''}
                disabled={isLoadingCompanies}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">
                  {isLoadingCompanies ? 'Loading companies...' : 'Select a company'}
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
                <option value="add-new">+ Add new company</option>
              </select>
            </div>

            {/* Add New Company Section */}
            {showAddCompany && (
              <div className={`p-6 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className="text-lg font-semibold mb-4">Add New Company</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={newCompanyData.name}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter company name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
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
                      value={newCompanyData.industry}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="e.g., Technology, Healthcare"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
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
                      value={newCompanyData.address}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Company address"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
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
                      value={newCompanyData.country}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  {/* Contact 1 */}
                  <div className="md:col-span-2">
                    <h4 className="font-medium mb-2">Primary Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={newCompanyData.contact_name}
                        onChange={(e) => setNewCompanyData(prev => ({ ...prev, contact_name: e.target.value }))}
                        placeholder="Contact name"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={newCompanyData.title}
                        onChange={(e) => setNewCompanyData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Title"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="email"
                        value={newCompanyData.email}
                        onChange={(e) => setNewCompanyData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="tel"
                        value={newCompanyData.phone}
                        onChange={(e) => setNewCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark
                            ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
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
                      value={newCompanyData.description}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the company"
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
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
                      value={newCompanyData.funding_terms}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, funding_terms: e.target.value }))}
                      placeholder="e.g., $500K Series A"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mt-6">
                  <button
                    onClick={handleAddCompany}
                    disabled={isLoading || !newCompanyData.name.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {isLoading ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCompany(false);
                      setNewCompanyData({
                        name: '',
                        industry: '',
                        address: '',
                        country: '',
                        contact_name: '',
                        title: '',
                        email: '',
                        phone: '',
                        description: '',
                        funding_terms: '',
                        key_team_members: '',
                        revenue: '',
                        valuation: '',
                        url: ''
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      isDark 
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Selected Company Display */}
            {selectedCompany && (
              <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Selected Company: <span className="font-semibold">{selectedCompany.name}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-blue-600 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              File Upload
            </h2>
          </div>
          <div className="p-6">
            {/* File Input */}
            <div className="mb-6">
              <label htmlFor="file-input" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Select Files
              </label>
              <input
                id="file-input"
                type="file"
                multiple
                accept={allowedFileTypes}
                onChange={handleFileChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white file:bg-gray-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3' 
                    : 'bg-white border-gray-300 text-gray-900 file:bg-gray-100 file:text-gray-700 file:border-0 file:rounded file:px-3 file:py-1 file:mr-3'
                }`}
              />
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Accepted formats: PDF, PPT, PPTX, XLS, XLSX
              </p>
            </div>

            {/* Selected Files Display */}
            {files && files.length > 0 && (
              <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Selected Files ({files.length}):
                </h3>
                <div className="space-y-4">
                  {Array.from(files).map((file, index) => (
                    <div key={index} className={`p-3 rounded border ${isDark ? 'border-gray-600 bg-gray-600' : 'border-gray-300 bg-white'}`}>
                      <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        <FileText className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Document Name
                          </label>
                          <input
                            type="text"
                            value={documentMetadata[file.name]?.name || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'name', e.target.value)}
                            placeholder="Document name"
                            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark 
                                ? 'bg-gray-700 border-gray-500 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={documentMetadata[file.name]?.description || ''}
                            onChange={(e) => handleMetadataChange(file.name, 'description', e.target.value)}
                            placeholder="Document description"
                            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark 
                                ? 'bg-gray-700 border-gray-500 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleFileUpload}
              disabled={isLoading || !selectedCompany || !files || files.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Upload className="w-5 h-5 mr-2" />
              {isLoading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-8 ${isDark ? 'bg-gray-800' : 'bg-gray-900'} text-white mt-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-xl font-bold text-blue-400 mb-3">
                Pitch Fork
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
            <p>&copy; 2025 Pitch Fork. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SubmitFiles;