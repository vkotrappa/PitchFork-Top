import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Building2, FileText, CheckCircle, AlertCircle, BarChart3, Loader } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import InvestorSelection from './InvestorSelection';

interface FounderSubmissionProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface CompanyData {
  name: string;
  industry: string;
  address: string;
  country: string;
  contact_name: string;
  title: string;
  email: string;
  phone: string;
  description: string;
  funding_terms: string;
  revenue?: string;
  valuation?: string;
  url?: string;
}

interface AnalysisResult {
  company_name?: string;
  industry?: string;
  description?: string;
  funding_terms?: string;
  contact_name?: string;
  title?: string;
  address?: string;
  country?: string;
}

const FounderSubmission: React.FC<FounderSubmissionProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyze' | 'company' | 'investors'>('upload');
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({
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
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<{[key: string]: {name: string, description: string}}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user data and prefill form
  React.useEffect(() => {
    const loadUserData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Get company ID from session storage
      const companyId = sessionStorage.getItem('companyId');

      if (companyId) {
        // Fetch the company record created during registration
        const { data: companyRecord, error: companyError } = await supabase
          .from('companies')
          .select('name, phone, email, contact_name')
          .eq('id', companyId)
          .maybeSingle();
        
        if (!companyError && companyRecord) {
          // Prefill form with company data from registration
          setCompanyData(prev => ({
            ...prev,
            name: companyRecord.name || '',
            phone: companyRecord.phone || '',
            contact_name: companyRecord.contact_name || currentUser.user_metadata?.full_name || `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim(),
            email: companyRecord.email || currentUser.email || ''
          }));
        } else {
          // Fallback to user metadata if company record not found
          setCompanyData(prev => ({
            ...prev,
            contact_name: currentUser.user_metadata?.full_name || `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim(),
            email: currentUser.email || ''
          }));
        }
      } else {
        // Fallback if no companyId in session
        setCompanyData(prev => ({
          ...prev,
          contact_name: currentUser.user_metadata?.full_name || `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim(),
          email: currentUser.email || ''
        }));
      }
      
      setIsInitialized(true);
    };

    loadUserData();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper function to check if field was AI-extracted
  const isFieldExtracted = (fieldName: string) => {
    if (!analysisResult) return false;
    const value = analysisResult[fieldName as keyof AnalysisResult];
    return value !== null && value !== undefined && value !== '';
  };

  const handlePitchDeckUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(extension)) {
        setMessage({ type: 'error', text: 'Please select a PDF, PPT, or PPTX file for your pitch deck' });
        return;
      }

      setPitchDeckFile(file);
      setMessage(null);
    }
  };

  const handleAdditionalFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.xls', '.xlsx'];
    
    // Filter valid files
    const validFiles = newFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return allowedExtensions.includes(extension);
    });

    if (validFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select only PDF, PPT, PPTX, XLS, or XLSX files' });
      return;
    }

    // Add new files to existing ones (avoid duplicates)
    const existingFileNames = additionalFiles.map(f => f.name);
    const uniqueNewFiles = validFiles.filter(file => !existingFileNames.includes(file.name));
    
    if (uniqueNewFiles.length === 0) {
      setMessage({ type: 'error', text: 'These files are already selected' });
      return;
    }

    const updatedFiles = [...additionalFiles, ...uniqueNewFiles];
    setAdditionalFiles(updatedFiles);
    
    // Initialize metadata for new files only
    const newMetadata = { ...documentMetadata };
    uniqueNewFiles.forEach(file => {
      newMetadata[file.name] = {
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for default name
        description: ''
      };
    });
    setDocumentMetadata(newMetadata);
    
    // Clear any error messages
    setMessage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      if (currentStep === 'upload') {
        // For pitch deck upload, only take the first file
        const file = droppedFiles[0];
        const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        
        if (allowedExtensions.includes(extension)) {
          setPitchDeckFile(file);
          setMessage(null);
        } else {
          setMessage({ type: 'error', text: 'Please select a PDF, PPT, or PPTX file for your pitch deck' });
        }
      } else {
        // For additional files
        handleAdditionalFiles(droppedFiles);
      }
    }
  };

  const handleRemoveAdditionalFile = (fileName: string) => {
    const updatedFiles = additionalFiles.filter(file => file.name !== fileName);
    setAdditionalFiles(updatedFiles);

    // Remove metadata
    const newMetadata = { ...documentMetadata };
    delete newMetadata[fileName];
    setDocumentMetadata(newMetadata);
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

  const analyzePitchDeck = async () => {
    if (!pitchDeckFile) {
      setMessage({ type: 'error', text: 'Please select a pitch deck file first' });
      return;
    }

    try {
      setIsAnalyzing(true);
      setMessage(null);
      setCurrentStep('analyze');

      // Get company ID from session storage
      const companyId = sessionStorage.getItem('companyId');
      if (!companyId) {
        setMessage({ type: 'error', text: 'Company ID not found. Please sign up again.' });
        setIsAnalyzing(false);
        setCurrentStep('upload');
        return;
      }

      // Upload pitch deck to Supabase Storage
      const filePath = `${companyId}/${pitchDeckFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, pitchDeckFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        setMessage({ type: 'error', text: 'Failed to upload pitch deck. Please try again.' });
        setCurrentStep('upload');
        setIsAnalyzing(false);
        return;
      }

      // Save document record
      const { error: docError } = await supabase
        .from('documents')
        .insert([{
          company_id: companyId,
          filename: pitchDeckFile.name,
          document_name: 'Pitch Deck',
          description: 'Main pitch deck presentation',
          path: filePath
        }]);

      if (docError) {
        console.error('Error saving document record:', docError);
        setMessage({ type: 'error', text: 'Failed to save document record' });
        setIsAnalyzing(false);
        setCurrentStep('upload');
        return;
      }

      // Call analyze-pdf edge function to extract data
      setMessage({ type: 'success', text: 'Analyzing pitch deck with AI... This may take a minute.' });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Calling analyze-pdf function with:', {
        file_path: filePath,
        company_id: companyId,
        session_present: !!session.access_token
      });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-pdf`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          company_id: companyId
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI extraction error:', errorData);
        // Don't fail the whole process - just show warning and allow manual entry
        setMessage({ type: 'error', text: `AI extraction failed: ${errorData.error || 'Unknown error'}. Please fill in the form manually.` });
        setCurrentStep('company');
        setIsAnalyzing(false);
        return;
      }

      const result = await response.json();
      console.log('AI extraction result:', result);

      // Pre-fill company form with extracted data
      if (result.extracted_info) {
        const extracted = result.extracted_info;
        
        setCompanyData(prev => ({
          ...prev,
          name: extracted.company_name || prev.name,
          industry: extracted.industry || prev.industry,
          description: extracted.description || prev.description,
          funding_terms: extracted.funding_terms || prev.funding_terms,
          revenue: extracted.revenue || prev.revenue,
          valuation: extracted.valuation || prev.valuation,
          url: extracted.url || prev.url,
        }));

        setAnalysisResult(extracted);
        setMessage({ 
          type: 'success', 
          text: 'AI extracted company information! Please review and edit as needed.' 
        });
      }

      // Move to company form step for review
      setCurrentStep('company');

    } catch (error) {
      console.error('Error in analyzePitchDeck:', error);
      setMessage({ 
        type: 'error', 
        text: 'An error occurred during analysis. Please fill in the form manually.' 
      });
      setCurrentStep('company');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a company name' });
      return;
    }

    if (!companyData.email.trim()) {
      setMessage({ type: 'error', text: 'Please enter a contact email' });
      return;
    }

    if (!pitchDeckFile) {
      setMessage({ type: 'error', text: 'Please upload a pitch deck' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Get company ID from session storage (created during signup)
      const companyId = sessionStorage.getItem('companyId');
      if (!companyId) {
        setMessage({ type: 'error', text: 'Company ID not found. Please sign up again.' });
        return;
      }

      // UPDATE existing company with edited information
      console.log('FounderSubmission: Updating company:', companyId);
      console.log('FounderSubmission: Update data:', {
        name: companyData.name,
        industry: companyData.industry,
        email: companyData.email
      });

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          industry: companyData.industry,
          address: companyData.address,
          country: companyData.country,
          contact_name: companyData.contact_name,
          title: companyData.title,
          email: companyData.email,
          phone: companyData.phone,
          description: companyData.description,
          funding_terms: companyData.funding_terms,
          revenue: companyData.revenue,
          valuation: companyData.valuation,
          url: companyData.url,
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('FounderSubmission: Error updating company:', updateError);
        console.error('FounderSubmission: Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        setMessage({ type: 'error', text: `Failed to update company information: ${updateError.message}` });
        return;
      }

      console.log('FounderSubmission: Company updated successfully');

      // NOTE: Pitch deck was already uploaded in analyzePitchDeck function
      // Only upload additional files here if any
      if (additionalFiles.length > 0) {
        const uploadPromises = [];
        const documentRecords = [];

        for (const file of additionalFiles) {
          const filePath = `${companyId}/${file.name}`;
          const metadata = documentMetadata[file.name] || { name: file.name, description: '' };

          const uploadPromise = supabase.storage
            .from('company-documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          uploadPromises.push(uploadPromise);
          documentRecords.push({
            company_id: companyId,
            filename: file.name,
            document_name: metadata.name,
            description: metadata.description,
            path: filePath
          });
        }

        const uploadResults = await Promise.all(uploadPromises);
        
        const failedUploads = uploadResults.filter(result => result.error);
        if (failedUploads.length > 0) {
          console.error('Upload errors:', failedUploads);
          setMessage({ type: 'error', text: `Failed to upload ${failedUploads.length} file(s)` });
          return;
        }

        const { error: dbError } = await supabase
          .from('documents')
          .insert(documentRecords);

        if (dbError) {
          console.error('Database error:', dbError);
          setMessage({ type: 'error', text: 'Files uploaded but failed to save records' });
          return;
        }
      }

      setMessage({ type: 'success', text: 'Company information saved! Now select investors.' });
      setSavedCompanyId(companyId);
      
      // Move to investor selection step
      setTimeout(() => {
        setCurrentStep('investors');
      }, 1000);

    } catch (error) {
      console.error('Submission error:', error);
      setMessage({ type: 'error', text: 'Failed to submit information' });
    } finally {
      setIsLoading(false);
    }
  };

  const skipToManualEntry = async () => {
    if (!pitchDeckFile) {
      setMessage({ type: 'error', text: 'Please select a pitch deck file first' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Get company ID from session storage
      const companyId = sessionStorage.getItem('companyId');
      if (!companyId) {
        setMessage({ type: 'error', text: 'Company ID not found. Please sign up again.' });
        setIsLoading(false);
        return;
      }

      // Upload pitch deck to Supabase Storage
      const filePath = `${companyId}/${pitchDeckFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, pitchDeckFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        setMessage({ type: 'error', text: 'Failed to upload pitch deck. Please try again.' });
        setIsLoading(false);
        return;
      }

      // Save document record
      const { error: docError } = await supabase
        .from('documents')
        .insert([{
          company_id: companyId,
          filename: pitchDeckFile.name,
          document_name: 'Pitch Deck',
          description: 'Main pitch deck presentation',
          path: filePath
        }]);

      if (docError) {
        console.error('Error saving document record:', docError);
        setMessage({ type: 'error', text: 'Failed to save document record' });
        setIsLoading(false);
        return;
      }

      // Skip AI analysis and go directly to company form
      setMessage({ type: 'success', text: 'Pitch deck uploaded! Please fill in your company information below.' });
      setCurrentStep('company');

    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvestorSelectionComplete = async () => {
    // Create welcome message after investor selection
    const companyId = savedCompanyId || sessionStorage.getItem('companyId');
    const currentUser = await getCurrentUser();
    
    if (companyId && currentUser) {
      await supabase
        .from('messages')
        .insert([{
          company_id: companyId,
          sender_type: 'system',
          sender_id: null,
          recipient_type: 'founder',
          recipient_id: currentUser.id,
          message_title: 'Pitch Deck Submitted',
          message_detail: 'Your pitch deck has been submitted to selected investors. Our AI has analyzed your pitch deck and extracted key details.',
          message_status: 'unread'
        }]);
    }

    // Navigate to founder dashboard
    navigate('/founder-dashboard');
  };

  const handleInvestorSelectionCancel = () => {
    // Allow founder to go back and edit company info
    setCurrentStep('company');
  };

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold text-blue-600">
                Pitch Fork
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-orange-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'upload' ? 'border-orange-600 bg-orange-100' : 'border-green-600 bg-green-100'}`}>
                1
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Upload</span>
            </div>
            <div className={`w-4 sm:w-8 h-1 ${currentStep === 'analyze' || currentStep === 'company' || currentStep === 'investors' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'analyze' ? 'text-orange-600' : currentStep === 'company' || currentStep === 'investors' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'analyze' ? 'border-orange-600 bg-orange-100' : currentStep === 'company' || currentStep === 'investors' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 font-medium hidden sm:inline">AI Analysis</span>
            </div>
            <div className={`w-4 sm:w-8 h-1 ${currentStep === 'company' || currentStep === 'investors' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'company' ? 'text-orange-600' : currentStep === 'investors' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'company' ? 'border-orange-600 bg-orange-100' : currentStep === 'investors' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Details</span>
            </div>
            <div className={`w-4 sm:w-8 h-1 ${currentStep === 'investors' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep === 'investors' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'investors' ? 'border-orange-600 bg-orange-100' : 'border-gray-300'}`}>
                4
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Investors</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-orange-600 mb-2">
            {currentStep === 'upload' && 'Upload Your Pitch Deck'}
            {currentStep === 'analyze' && 'Analyzing Your Pitch Deck'}
            {currentStep === 'company' && 'Complete Company Information'}
            {currentStep === 'investors' && 'Select Investors'}
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {currentStep === 'upload' && 'Start by uploading your pitch deck for AI analysis'}
            {currentStep === 'analyze' && 'Our AI is analyzing your pitch deck to extract company information'}
            {currentStep === 'company' && 'Review and complete your company information'}
            {currentStep === 'investors' && 'Choose which investors you\'d like to submit your pitch deck to'}
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

        {/* Step 1: Upload Pitch Deck */}
        {currentStep === 'upload' && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-orange-600 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload Your Pitch Deck
              </h2>
            </div>
            <div className="p-6">
              <div 
                className={`p-8 border-2 border-dashed rounded-lg transition-colors ${
                  isDragOver 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                    : isDark 
                      ? 'border-gray-600 bg-gray-700' 
                      : 'border-gray-300 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragOver ? 'text-orange-500' : 'text-gray-400'}`} />
                  <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {pitchDeckFile ? pitchDeckFile.name : 'Drop your pitch deck here or click to browse'}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                    Accepted formats: PDF, PPT, PPTX
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handlePitchDeckUpload}
                    className="hidden"
                    id="pitch-deck-input"
                  />
                  <label
                    htmlFor="pitch-deck-input"
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 cursor-pointer inline-block transition-colors"
                  >
                    Choose File
                  </label>
                </div>
              </div>
              
              {pitchDeckFile && (
                <div className="mt-6 text-center space-y-3">
                  <button
                    onClick={analyzePitchDeck}
                    disabled={isAnalyzing || isLoading}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center text-lg"
                  >
                    <BarChart3 className="w-5 h-5 mr-2" />
                    {isAnalyzing ? 'Analyzing with AI...' : 'Update with AI'}
                  </button>
                  
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    or
                  </div>
                  
                  <button
                    onClick={skipToManualEntry}
                    disabled={isAnalyzing || isLoading}
                    className={`px-8 py-3 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center text-lg ${
                      isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {isLoading ? 'Uploading...' : 'Manually Update Company'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Analysis in Progress */}
        {currentStep === 'analyze' && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-12 text-center">
              <Loader className="w-16 h-16 mx-auto mb-6 text-orange-600 animate-spin" />
              <h3 className="text-2xl font-bold mb-4">AI Analysis in Progress</h3>
              
              <div className={`max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'} text-left mb-6`}>
                <p className="text-lg mb-4">
                  We are now using AI to extract key information from your pitch deck for your company information. 
                  You will have an opportunity to edit it and submit it to multiple investors.
                </p>
                
                <p className="text-lg mb-4">
                  The system will automatically run a preliminary "Screening" of the deck against their basic 
                  screening/filter criteria (such as revenue, industry, etc.) and send a basic recommendation 
                  to continue analysis or not.
                </p>
              </div>

              <div className={`max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm space-y-2 mb-6`}>
                <p>✓ Uploading pitch deck to secure storage</p>
                <p>✓ Analyzing with GPT-4 Turbo</p>
                <p>✓ Extracting company details</p>
                <p>✓ Preparing for investor screening</p>
                <p className="font-semibold">⏳ This usually takes 30-60 seconds</p>
              </div>
              
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Company Information Form */}
        {currentStep === 'company' && (
          <form onSubmit={handleSubmit}>
            {/* Company Information */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-orange-600 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Company Information
                  {analysisResult && (
                    <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      AI Pre-filled
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Company Name *
                      {isFieldExtracted('company_name') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={companyData.name}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Industry
                      {isFieldExtracted('industry') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={companyData.industry}
                      onChange={handleInputChange}
                      placeholder="e.g., Technology, Healthcare"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
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
                      value={companyData.address}
                      onChange={handleInputChange}
                      placeholder="Company address"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
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
                      value={companyData.country}
                      onChange={handleInputChange}
                      placeholder="Country"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  {/* Primary Contact */}
                  <div className="md:col-span-2">
                    <h4 className="font-medium mb-2">Primary Contact *</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="contact_name"
                        required
                        value={companyData.contact_name}
                        onChange={handleInputChange}
                        placeholder="Contact name"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="text"
                        name="title"
                        value={companyData.title}
                        onChange={handleInputChange}
                        placeholder="Title"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="email"
                        name="email"
                        required
                        value={companyData.email}
                        onChange={handleInputChange}
                        placeholder="Email *"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <input
                        type="tel"
                        name="phone"
                        value={companyData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone"
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
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
                      {isFieldExtracted('description') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <textarea
                      name="description"
                      value={companyData.description}
                      onChange={handleInputChange}
                      placeholder="Brief description of your company and what you do"
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Funding Sought
                      {isFieldExtracted('funding_terms') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="funding_terms"
                      value={companyData.funding_terms}
                      onChange={handleInputChange}
                      placeholder="e.g., $500K Series A, $2M Seed Round"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Additional Fields */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Revenue
                      {isFieldExtracted('revenue') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="revenue"
                      value={companyData.revenue}
                      onChange={handleInputChange}
                      placeholder="e.g., $1M ARR"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Valuation
                      {isFieldExtracted('valuation') && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          ✓ AI Extracted
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="valuation"
                      value={companyData.valuation}
                      onChange={handleInputChange}
                      placeholder="e.g., $10M"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
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
                      value={companyData.url}
                      onChange={handleInputChange}
                      placeholder="https://yourcompany.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* Additional Documents Section */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-orange-600 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Additional Documents (Optional)
                </h2>
              </div>
              <div className="p-6">
                <div 
                  className={`p-6 border-2 border-dashed rounded-lg transition-colors ${
                    isDragOver 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                      : isDark 
                        ? 'border-gray-600 bg-gray-700' 
                        : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <FileText className={`w-12 h-12 mx-auto mb-2 ${isDragOver ? 'text-orange-500' : 'text-gray-400'}`} />
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                      Drop additional documents here or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.ppt,.pptx,.xls,.xlsx"
                      onChange={(e) => e.target.files && handleAdditionalFiles(e.target.files)}
                      className="hidden"
                      id="additional-files-input"
                    />
                    <label
                      htmlFor="additional-files-input"
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 cursor-pointer inline-block transition-colors"
                    >
                      Choose Files
                    </label>
                  </div>
                </div>
                <p className={`mt-2 text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Accepted formats: PDF, PPT, PPTX, XLS, XLSX
                </p>

                {/* Additional Files Display */}
                {additionalFiles.length > 0 && (
                  <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Additional Files ({additionalFiles.length}):
                    </h3>
                    <div className="space-y-4">
                      {additionalFiles.map((file, index) => (
                        <div key={index} className={`p-3 rounded border ${isDark ? 'border-gray-600 bg-gray-600' : 'border-gray-300 bg-white'}`}>
                          <div className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2" />
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdditionalFile(file.name)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium"
                            >
                              Remove
                            </button>
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
                                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-orange-500 ${
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
                                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-orange-500 ${
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
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-orange-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center text-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isLoading ? 'Submitting...' : 'Submit Company Information'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Investor Selection */}
        {currentStep === 'investors' && savedCompanyId && (
          <InvestorSelection
            companyId={savedCompanyId}
            onComplete={handleInvestorSelectionComplete}
            onCancel={handleInvestorSelectionCancel}
          />
        )}
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

export default FounderSubmission;