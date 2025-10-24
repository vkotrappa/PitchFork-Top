import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, User, Mail, Phone, FileText, ChevronDown, MessageCircle, Send, Download, BarChart3, Users, Trash2 } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface VentureDetailProps {
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
  email_1?: string;
  phone?: string;
  phone_1?: string;
  description?: string;
  funding_terms?: string;
  status?: string;
  date_submitted: string;
  created_at: string;
  revenue?: string;
  valuation?: string;
  url?: string;
}

interface Analysis {
  id: string;
  investor_user_id: string;
  status: string;
  overall_score?: number;
  recommendation?: string;
  recommendation_reason?: string;
  comments?: string;
  analyzed_at?: string;
  history?: string;
  investor_details?: {
    name: string;
    firm_name?: string;
  };
}

interface AnalysisReport {
  id: string;
  report_type: string;
  file_name: string;
  file_path: string;
  generated_at: string;
}

interface Document {
  id: string;
  document_name: string;
  description?: string;
  path: string;
  date_added: string;
}

const VentureDetail: React.FC<VentureDetailProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [analysis, setAnalysis] = useState<Analysis[]>([]);
  const [analysisReports, setAnalysisReports] = useState<AnalysisReport[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUtilitiesMenu, setShowUtilitiesMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageDetail, setMessageDetail] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAnalyzingTeam, setIsAnalyzingTeam] = useState(false);
  const [teamAnalysisResult, setTeamAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState(false);
  const [isAnalyzingFinancials, setIsAnalyzingFinancials] = useState(false);
  const [isCreatingScoreCard, setIsCreatingScoreCard] = useState(false);
  const [isCreatingDetailReport, setIsCreatingDetailReport] = useState(false);
  const [isCreatingDiligenceQuestions, setIsCreatingDiligenceQuestions] = useState(false);
  const [isCreatingFounderReport, setIsCreatingFounderReport] = useState(false);

  // Check authentication and load company data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      
      if (id) {
        await loadCompanyData(id);
        await loadAnalysis(id);
        await loadAnalysisReports(id);
        await loadDocuments(id);
      }
    };
    
    checkAuthAndLoadData();
  }, [navigate, id]);

  const loadCompanyData = async (companyId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('Error loading company:', error);
        setError('Failed to load company data');
        return;
      }

      if (!data) {
        setError('Company not found');
        return;
      }

      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
      setError('Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async (companyId: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        setAnalysis([]);
        return;
      }

      const { data, error } = await supabase
        .from('analysis')
        .select('*')
        .eq('company_id', companyId)
        .eq('investor_user_id', currentUser.id);

      if (error) {
        console.error('Error loading analysis:', error);
        setAnalysis([]);
        return;
      }

      setAnalysis(data || []);
    } catch (error) {
      console.error('Error loading analysis:', error);
      setAnalysis([]);
    }
  };

  const loadAnalysisReports = async (companyId: string) => {
    try {
      console.log('=== LOADING ANALYSIS REPORTS ===');
      console.log('Company ID:', companyId);
      
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        console.log('No current user, setting reports to empty');
        setAnalysisReports([]);
        return;
      }

      console.log('Current user:', currentUser.id);

      // Get the analysis ID for this investor-company pair
      const { data: analysisData, error: analysisError } = await supabase
        .from('analysis')
        .select('id')
        .eq('company_id', companyId)
        .eq('investor_user_id', currentUser.id)
        .maybeSingle();

      if (analysisError) {
        console.error('Error loading analysis:', analysisError);
        setAnalysisReports([]);
        return;
      }

      if (!analysisData) {
        // No analysis for this investor-company pair yet
        console.log('No analysis data found for this investor-company pair');
        setAnalysisReports([]);
        return;
      }

      console.log('Analysis ID:', analysisData.id);

      // Load reports for this specific analysis
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('analysis_id', analysisData.id)
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error loading analysis reports:', error);
        return;
      }

      console.log('Found reports:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Report details:');
        data.forEach((report, index) => {
          console.log(`  ${index + 1}. ${report.report_type} - ${report.file_name} (ID: ${report.id})`);
        });
      }

      setAnalysisReports(data || []);
    } catch (error) {
      console.error('Error loading analysis reports:', error);
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
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleDownloadReport = async (report: AnalysisReport) => {
    try {
      console.log('=== DOWNLOAD WORKFLOW STARTED ===');
      console.log('1. Report from database:');
      console.log('   - file_path:', report.file_path);
      console.log('   - file_name:', report.file_name);
      console.log('   - report_type:', report.report_type);
      console.log('   - report_id:', report.id);
      setMessageStatus({ type: 'success', text: 'Downloading report...' });
      
      // First, verify the file exists in storage
      const pathParts = report.file_path.split('/');
      const folderPath = pathParts[0];
      const fileName = pathParts[pathParts.length - 1];
      console.log('2. Parsed path:');
      console.log('   - folder:', folderPath);
      console.log('   - fileName from path:', fileName);
      console.log('   - file_name field:', report.file_name);
      console.log('   - Match?', fileName === report.file_name);
      
      console.log('3. Listing files in storage bucket analysis-output-docs...');
      const { data: fileList, error: listError } = await supabase.storage
        .from('analysis-output-docs')
        .list(folderPath, {
          search: report.file_name
        });

      if (listError) {
        console.warn('4. List operation failed:', listError.message);
        console.log('   Reason: Likely RLS restriction on bucket');
        console.log('   Will proceed with direct download attempt...');
      } else if (!fileList || fileList.length === 0) {
        console.warn('4. List returned empty (file not found via search)');
        console.log('   Searching for:', report.file_name);
        console.log('   In folder:', folderPath);
        
        // List ALL files in the folder to see what's actually there
        console.log('5. Listing ALL files in folder for debugging...');
        const { data: allFiles, error: listAllError } = await supabase.storage
          .from('analysis-output-docs')
          .list(folderPath);
        
        if (listAllError) {
          console.warn('   Cannot list files (RLS restriction):', listAllError.message);
        } else if (allFiles && allFiles.length > 0) {
          console.log('   Files actually in storage:');
          allFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. "${file.name}" (id: ${file.id})`);
          });
          console.log('   ');
          console.log('   COMPARISON:');
          console.log('   Looking for: "' + report.file_name + '"');
          console.log('   Length:', report.file_name.length, 'chars');
          allFiles.forEach(file => {
            if (file.name.includes('team-analysis')) {
              console.log('   Found match: "' + file.name + '"');
              console.log('   Length:', file.name.length, 'chars');
              console.log('   Exact match?', file.name === report.file_name);
              if (file.name !== report.file_name) {
                console.log('   MISMATCH DETECTED!');
                console.log('   Database has: "' + report.file_name + '"');
                console.log('   Storage has:  "' + file.name + '"');
              }
            }
          });
        } else {
          console.log('   Folder is empty or does not exist');
        }
        
        console.log('   Will proceed with download attempt anyway...');
      } else {
        console.log('4. File verified in storage via list operation');
        console.log('   Found:', fileList.length, 'matching file(s)');
      }

      console.log('6. Creating signed URL via edge function...');
      console.log('   Edge function URL: /functions/v1/get-report-download-url');
      console.log('   Requesting signed URL for path:', report.file_path);
      
      // Call edge function to create signed URL (bypasses RLS restrictions)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/get-report-download-url`;
      const session = await supabase.auth.getSession();
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          file_path: report.file_path,
          expires_in: 60
        })
      });
      
      console.log('7. Edge function response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('   ❌ Edge function failed!');
        console.error('   Error:', errorData);
        setMessageStatus({ 
          type: 'error', 
          text: `Failed to create download link: ${errorData.error || response.statusText}` 
        });
        return;
      }

      const signedUrlResult = await response.json();
      console.log('   ✅ Edge function succeeded');
      console.log('   Response:', signedUrlResult);
      
      if (!signedUrlResult?.signed_url) {
        console.error('   ❌ No signed URL in response!');
        console.error('   Response data:', signedUrlResult);
        setMessageStatus({ type: 'error', text: 'Failed to generate download link' });
        return;
      }

      const signedUrl = signedUrlResult.signed_url;
      console.log('   Signed URL obtained:', signedUrl.substring(0, 100) + '...');

      console.log('8. Downloading file from signed URL...');
      const fileResponse = await fetch(signedUrl);
      console.log('   Response status:', fileResponse.status, fileResponse.statusText);
      
      if (!fileResponse.ok) {
        console.error('   ❌ Failed to fetch file from signed URL');
        console.error('   Status:', fileResponse.status);
        console.error('   Status text:', fileResponse.statusText);
        setMessageStatus({ type: 'error', text: `Failed to download file: ${fileResponse.statusText}` });
        return;
      }

      const blob = await fileResponse.blob();
      console.log('   ✅ File downloaded successfully');
      console.log('   File size:', blob.size, 'bytes');
      console.log('   File type:', blob.type);

      // Create download link
      console.log('9. Triggering browser download...');
      console.log('   Download as:', report.file_name);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = report.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('=== DOWNLOAD WORKFLOW COMPLETED SUCCESSFULLY ===');
      setMessageStatus({ type: 'success', text: 'Report downloaded successfully!' });
      setTimeout(() => setMessageStatus(null), 3000);
    } catch (error) {
      console.error('=== DOWNLOAD WORKFLOW FAILED ===');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      setMessageStatus({ 
        type: 'error', 
        text: 'Failed to download report. Check console for details.' 
      });
    }
  };

  const handleDeleteReport = async (report: AnalysisReport) => {
    if (!confirm(`Are you sure you want to delete "${report.file_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setMessageStatus({ type: 'success', text: 'Deleting report...' });
      console.log('=== DELETE REPORT STARTED ===');
      console.log('Report to delete:', {
        id: report.id,
        file_name: report.file_name,
        file_path: report.file_path,
        report_type: report.report_type
      });

      // Delete the file from storage
      console.log('1. Deleting file from storage:', report.file_path);
      const { error: storageError } = await supabase.storage
        .from('analysis-output-docs')
        .remove([report.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      } else {
        console.log('✅ File deleted from storage successfully');
      }

      // Verify the entry exists before deletion
      console.log('2a. Verifying entry exists before deletion...');
      const { data: beforeData, error: beforeError } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('id', report.id)
        .single();

      if (beforeError) {
        console.error('Error checking if entry exists:', beforeError);
        setMessageStatus({ 
          type: 'error', 
          text: 'Could not verify report exists' 
        });
        return;
      }

      if (!beforeData) {
        console.log('❌ Report entry not found in database - may have already been deleted');
        setMessageStatus({ 
          type: 'error', 
          text: 'Report not found in database' 
        });
        return;
      }

      console.log('✅ Report entry confirmed to exist:', {
        id: beforeData.id,
        file_name: beforeData.file_name,
        report_type: beforeData.report_type
      });

      // Delete the database entry
      console.log('2b. Deleting database entry with ID:', report.id);
      const { error: dbError } = await supabase
        .from('analysis_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) {
        console.error('Error deleting report from database:', dbError);
        setMessageStatus({ 
          type: 'error', 
          text: 'Failed to delete report from database' 
        });
        return;
      } else {
        console.log('✅ Database delete command executed successfully');
      }

      // Verify the entry is gone after deletion
      console.log('2c. Verifying entry is deleted...');
      const { data: afterData, error: afterError } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('id', report.id)
        .maybeSingle();

      if (afterError) {
        console.error('Error checking if entry was deleted:', afterError);
      } else if (afterData) {
        console.log('❌ PROBLEM: Entry still exists after deletion!', afterData);
        setMessageStatus({ 
          type: 'error', 
          text: 'Report was not deleted from database' 
        });
        return;
      } else {
        console.log('✅ Database entry confirmed to be deleted');
      }

      // Reload the reports list to update the UI
      console.log('3. Reloading analysis reports...');
      await loadAnalysisReports(id!);
      
      console.log('=== DELETE REPORT COMPLETED ===');
      setMessageStatus({ 
        type: 'success', 
        text: 'Report deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      setMessageStatus({ 
        type: 'error', 
        text: 'Failed to delete report' 
      });
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      console.log('Downloading document:', doc.path);
      setMessageStatus({ type: 'success', text: 'Downloading document...' });

      // Create a signed URL for secure download
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('company-documents')
        .createSignedUrl(doc.path, 60); // 60 seconds expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        setMessageStatus({ type: 'error', text: `Failed to create download link: ${signedUrlError.message}` });
        return;
      }

      if (!signedUrlData?.signedUrl) {
        console.error('No signed URL returned');
        setMessageStatus({ type: 'error', text: 'Failed to generate download link' });
        return;
      }

      console.log('Signed URL created successfully');

      // Download the file using the signed URL
      const response = await fetch(signedUrlData.signedUrl);
      
      if (!response.ok) {
        console.error('Failed to fetch file:', response.status, response.statusText);
        setMessageStatus({ type: 'error', text: `Failed to download file: ${response.statusText}` });
        return;
      }

      const blob = await response.blob();
      console.log('Download successful, file size:', blob.size);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessageStatus({ type: 'success', text: 'Document downloaded successfully!' });
      setTimeout(() => setMessageStatus(null), 3000);
    } catch (error) {
      console.error('Error downloading document:', error);
      setMessageStatus({ type: 'error', text: 'Failed to download document' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!company || isUpdating) return;

    try {
      setIsUpdating(true);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }

      // Map button labels to database status values
      let dbStatus = newStatus;
      if (newStatus === 'Move to Diligence') {
        dbStatus = 'In-Diligence';
      } else if (newStatus === 'Reject') {
        dbStatus = 'Rejected';
      }

      // Get current history from the analysis record
      const { data: currentAnalysis } = await supabase
        .from('analysis')
        .select('history')
        .eq('company_id', company.id)
        .eq('investor_user_id', currentUser.id)
        .single();

      // Create new history entry
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentHistory = currentAnalysis?.history || '';
      
      let historyEntry = '';
      if (newStatus === 'Reject') {
        historyEntry = `${currentDate}: Rejected`;
      } else if (newStatus === 'Move to Diligence') {
        historyEntry = `${currentDate}: Diligence`;
      }

      // Append new history entry
      const updatedHistory = currentHistory 
        ? `${currentHistory}\n${historyEntry}` 
        : historyEntry;

      // Update status and history in analysis table for this investor-company pair
      const { error } = await supabase
        .from('analysis')
        .update({ 
          status: dbStatus,
          history: updatedHistory
        })
        .eq('company_id', company.id)
        .eq('investor_user_id', currentUser.id);

      if (error) {
        console.error('Error updating status:', error);
        return;
      }

      // Reload analysis to update local state
      await loadAnalysis(company.id);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/');
    }
  };

  // Generic analysis handler for all analysis types
  const handleAnalysis = async (analysisType: 'team' | 'product' | 'market' | 'financial') => {
    if (!company) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    const typeConfig = {
      team: { setLoading: setIsAnalyzingTeam, promptName: 'Team-Analysis', label: 'Team', historyLabel: 'Analyze-Team' },
      product: { setLoading: setIsAnalyzingProduct, promptName: 'Product-Analysis', label: 'Product', historyLabel: 'Analyze-Product' },
      market: { setLoading: setIsAnalyzingMarket, promptName: 'Market-Analysis', label: 'Market', historyLabel: 'Analyze-Market' },
      financial: { setLoading: setIsAnalyzingFinancials, promptName: 'Financial-Analysis', label: 'Financial', historyLabel: 'Analyze-Financials' },
    };

    const config = typeConfig[analysisType];

    try {
      config.setLoading(true);
      setMessageStatus(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessageStatus({ type: 'error', text: `You must be logged in to perform ${config.label.toLowerCase()} analysis` });
        return;
      }

      // Get or create analysis record for this investor-company pair
      let analysisId = analysis.length > 0 ? analysis[0].id : null;
      
      if (!analysisId) {
        const { data: newAnalysis, error: analysisError } = await supabase
          .from('analysis')
          .insert([{
            company_id: company.id,
            investor_user_id: currentUser.id,
            status: 'Screened'
          }])
          .select('id')
          .single();

        if (analysisError) {
          console.error('Error creating analysis record:', analysisError);
          setMessageStatus({ type: 'error', text: 'Failed to create analysis record' });
          return;
        }
        analysisId = newAnalysis.id;
      }

      // Get the prompt from prompts table
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('prompt_detail')
        .eq('prompt_name', config.promptName)
        .single();

      if (promptError) {
        console.error(`Error fetching ${config.promptName} prompt:`, promptError);
        setMessageStatus({ type: 'error', text: `${config.promptName} prompt not found in database. Please add it to the prompts table.` });
        return;
      }

      if (!promptData || !promptData.prompt_detail) {
        console.error('Prompt data is empty');
        setMessageStatus({ type: 'error', text: `${config.promptName} prompt is empty` });
        return;
      }

      console.log('Found prompt, length:', promptData.prompt_detail.length);

      // Get company documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', company.id);

      if (documentsError) {
        console.error('Error fetching company documents:', documentsError);
        setMessageStatus({ type: 'error', text: 'Failed to fetch company documents' });
        return;
      }

      if (!documentsData || documentsData.length === 0) {
        setMessageStatus({ type: 'error', text: `No documents found for ${config.label.toLowerCase()} analysis` });
        return;
      }

      console.log('Documents to analyze:', documentsData.map(doc => ({
        id: doc.id,
        name: doc.document_name,
        path: doc.path
      })));

      // Call the generic analyze-company function
      const requestBody = {
        companyId: company.id,
        companyName: company.name,
        analysisId: analysisId,
        analysisType: analysisType,
        prompt: promptData.prompt_detail,
        documents: documentsData.map(doc => ({
          id: doc.id,
          name: doc.document_name,
          path: doc.path
        }))
      };
      
      console.log('Calling analyze-company function with:', {
        companyId: requestBody.companyId,
        companyName: requestBody.companyName,
        analysisId: requestBody.analysisId,
        analysisType: requestBody.analysisType,
        promptLength: requestBody.prompt?.length,
        documentsCount: requestBody.documents.length,
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/analyze-company-background`;
      const session = await supabase.auth.getSession();
      
      console.log('Starting background analysis:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Background analysis response status:', response.status);
      
      const responseText = await response.text();
      console.log('Background analysis response body:', responseText);

      if (!response.ok) {
        let errorMessage = `Failed to start ${config.label.toLowerCase()} analysis`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = `Analysis failed to start: ${errorData.error}`;
          }
          console.error('Parsed error:', errorData);
        } catch (e) {
          console.error('Could not parse error response:', responseText);
          errorMessage = `Failed to start ${config.label.toLowerCase()} analysis (${response.status})`;
        }
        setMessageStatus({ type: 'error', text: errorMessage });
        return;
      }

      const result = JSON.parse(responseText);
      console.log('Background analysis started:', result);

      // Set up real-time subscription to listen for analysis completion
      const analysisSubscription = supabase
        .channel(`analysis-${analysisId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis',
          filter: `id=eq.${analysisId}`
        }, (payload) => {
          console.log('Analysis status update:', payload);
          const newStatus = payload.new.status;
          
          if (newStatus === 'completed') {
            setMessageStatus({ type: 'success', text: `${config.label} analysis completed successfully!` });
            
            // Update analysis history
            const currentDate = new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
            const currentHistory = analysis.length > 0 && analysis[0].history ? analysis[0].history : '';
            const newHistoryEntry = `${currentDate}: ${config.historyLabel} - Complete`;
            const updatedHistory = currentHistory ? `${currentHistory}\n${newHistoryEntry}` : newHistoryEntry;
            
            supabase
              .from('analysis')
              .update({ history: updatedHistory })
              .eq('id', analysisId);
            
            loadAnalysis(company.id); // Reload analysis
            loadAnalysisReports(company.id); // Reload reports
            analysisSubscription.unsubscribe(); // Clean up subscription
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
              setMessageStatus(null);
            }, 5000);
          } else if (newStatus === 'failed') {
            setMessageStatus({ type: 'error', text: `${config.label} analysis failed` });
            analysisSubscription.unsubscribe(); // Clean up subscription
          }
        })
        .subscribe();

      // Show immediate feedback that analysis has started
      setMessageStatus({ type: 'info', text: `${config.label} analysis started in background...` });
      
      // Set a timeout to clean up subscription after 5 minutes
      setTimeout(() => {
        analysisSubscription.unsubscribe();
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error(`Error performing ${config.label.toLowerCase()} analysis:`, error);
      setMessageStatus({ type: 'error', text: `An unexpected error occurred during ${config.label.toLowerCase()} analysis` });
    } finally {
      config.setLoading(false);
    }
  };

  // Wrapper functions for each analysis type
  const handleAnalyzeTeam = () => handleAnalysis('team');
  const handleAnalyzeProduct = () => handleAnalysis('product');
  const handleAnalyzeMarket = () => handleAnalysis('market');
  const handleAnalyzeFinancials = () => handleAnalysis('financial');

  const handleCreateScoreCard = async () => {
    if (!company || !id) {
      alert('Company information not available');
      return;
    }

    if (analysisReports.length === 0) {
      alert('No analysis reports available. Please run at least one analysis first.');
      return;
    }

    setIsCreatingScoreCard(true);
    try {
      console.log('Creating score card for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Prepare existing reports summary for the AI
      const reportsSummary = analysisReports
        .filter(report => report.report_path) // Filter out reports with missing paths
        .map(report => ({
          type: report.report_type,
          path: report.report_path,
          generated_at: report.generated_at
        }));

      console.log('Existing reports:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);

      // Call the analyze-company edge function with scorecard type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyId: id,
            companyName: company.name,
            analysisId: analysisId,
            analysisType: 'scorecard',
            documents: documents.map(doc => ({
              id: doc.id,
              name: doc.name,
              path: doc.path
            })),
            existingReports: reportsSummary
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to create score card';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Score card created:', result);

      // Reload the analysis reports to show the new score card
      await loadAnalysisReports(id);
      
      alert('Score card created successfully!');
    } catch (error) {
      console.error('Error creating score card:', error);
      alert(`Failed to create score card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingScoreCard(false);
    }
  };

  const handleCreateDetailReport = async () => {
    if (!company || !id) {
      alert('Company information not available');
      return;
    }

    if (analysisReports.length === 0) {
      alert('No analysis reports available. Please run at least one analysis first.');
      return;
    }

    setIsCreatingDetailReport(true);
    try {
      console.log('Creating detail report for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Prepare existing reports summary for the AI
      const reportsSummary = analysisReports
        .filter(report => report.report_path) // Filter out reports with missing paths
        .map(report => ({
          type: report.report_type || 'unknown',
          path: report.report_path,
          generated_at: report.generated_at || new Date().toISOString()
        }));

      console.log('Existing reports for detail compilation:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);
      console.log('Documents for detail compilation:', documents);

      // Call the analyze-company edge function with detail-report type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyId: id,
            companyName: company.name,
            analysisId: analysisId,
            analysisType: 'detail-report',
            documents: documents.map(doc => ({
              id: doc.id || '',
              name: doc.name || '',
              path: doc.path || ''
            })),
            existingReports: reportsSummary
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to create detail report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Detail report created:', result);

      // Reload the analysis reports to show the new detail report
      await loadAnalysisReports(id);
      
      alert('Detail report created successfully!');
    } catch (error) {
      console.error('Error creating detail report:', error);
      alert(`Failed to create detail report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingDetailReport(false);
    }
  };

  const handleCreateDiligenceQuestions = async () => {
    if (!company || !id) {
      alert('Company information not available');
      return;
    }

    if (analysisReports.length === 0) {
      alert('No analysis reports available. Please run at least one analysis first.');
      return;
    }

    setIsCreatingDiligenceQuestions(true);
    try {
      console.log('Creating diligence questions for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Prepare existing reports summary for the AI
      const reportsSummary = analysisReports
        .filter(report => report.report_path) // Filter out reports with missing paths
        .map(report => ({
          type: report.report_type,
          path: report.report_path,
          generated_at: report.generated_at
        }));

      console.log('Existing reports for diligence questions:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);

      // Call the analyze-company edge function with diligence-questions type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyId: id,
            companyName: company.name,
            analysisId: analysisId,
            analysisType: 'diligence-questions',
            documents: documents.map(doc => ({
              id: doc.id,
              name: doc.name,
              path: doc.path
            })),
            existingReports: reportsSummary
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to create diligence questions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Diligence questions created:', result);

      // Reload the analysis reports to show the new diligence questions
      await loadAnalysisReports(id);
      
      alert('Diligence questions created successfully!');
    } catch (error) {
      console.error('Error creating diligence questions:', error);
      alert(`Failed to create diligence questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingDiligenceQuestions(false);
    }
  };

  const handleCreateFounderReport = async () => {
    if (!company || !id) {
      alert('Company information not available');
      return;
    }

    if (analysisReports.length === 0) {
      alert('No analysis reports available. Please run at least one analysis first.');
      return;
    }

    setIsCreatingFounderReport(true);
    try {
      console.log('Creating founder report for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Prepare existing reports summary for the AI
      const reportsSummary = analysisReports
        .filter(report => report.report_path) // Filter out reports with missing paths
        .map(report => ({
          type: report.report_type,
          path: report.report_path,
          generated_at: report.generated_at
        }));

      console.log('Existing reports for founder feedback:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);

      // Call the analyze-company edge function with founder-report type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyId: id,
            companyName: company.name,
            analysisId: analysisId,
            analysisType: 'founder-report',
            documents: documents.map(doc => ({
              id: doc.id,
              name: doc.name,
              path: doc.path
            })),
            existingReports: reportsSummary
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to create founder report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Founder report created:', result);

      // Reload the analysis reports to show the new founder report
      await loadAnalysisReports(id);
      
      alert('Founder report created successfully!');
    } catch (error) {
      console.error('Error creating founder report:', error);
      alert(`Failed to create founder report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingFounderReport(false);
    }
  };

  const handleQuickMessage = async () => {
    if (!messageTitle.trim()) {
      setMessageStatus({ type: 'error', text: 'Please enter a message' });
      return;
    }

    if (!company) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    try {
      setIsSendingMessage(true);
      setMessageStatus(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessageStatus({ type: 'error', text: 'You must be logged in to send messages' });
        return;
      }

      // Save message to database
      const { error } = await supabase
        .from('messages')
        .insert([{
          company_id: company.id,
          sender_type: 'investor',
          sender_id: currentUser.id,
          recipient_type: 'founder',
          recipient_id: null, // Will be handled by RLS policies
          message_title: messageTitle.trim(),
          message_detail: messageTitle.trim(), // Use same content for both
          message_status: 'unread'
        }]);

      if (error) {
        console.error('Error sending message:', error);
        setMessageStatus({ type: 'error', text: 'Failed to send message. Please try again.' });
        return;
      }

      // Send email notification
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
        const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('No valid session for email notification:', sessionError);
          // Don't fail the whole operation if email fails
          return;
        }
        
        console.log('Calling email function with session...');
        
        const emailResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            toEmail: 'vkotrappa@gmail.com',
            toName: 'Admin',
            subject: messageTitle.trim(),
            body: messageTitle.trim(),
            senderName: 'Admin@PitchFork.com',
            companyName: company.name,
            messageType: 'investor'
          })
        });

        console.log('Email response status:', emailResponse.status);
        
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Failed to send email notification:', errorText);
          // Don't fail the whole operation if email fails
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the whole operation if email fails
      }

      setMessageStatus({ type: 'success', text: 'Message sent successfully!' });
      setMessageTitle('');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessageStatus(null);
      }, 3000);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessageStatus({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageDetail.trim()) {
      setMessageStatus({ type: 'error', text: 'Please fill in both title and message' });
      return;
    }

    if (!company) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    try {
      setIsSendingMessage(true);
      setMessageStatus(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessageStatus({ type: 'error', text: 'You must be logged in to send messages' });
        return;
      }

      // Save message to database
      const { error } = await supabase
        .from('messages')
        .insert([{
          company_id: company.id,
          sender_type: 'investor',
          sender_id: currentUser.id,
          recipient_type: 'founder',
          recipient_id: null, // Will be handled by RLS policies
          message_title: messageTitle.trim(),
          message_detail: messageDetail.trim(),
          message_status: 'unread'
        }]);

      if (error) {
        console.error('Error sending message:', error);
        setMessageStatus({ type: 'error', text: 'Failed to send message. Please try again.' });
        return;
      }

      // Send email notification
      let emailSent = false;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
        const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('No valid session for email notification:', sessionError);
          // Don't fail the whole operation if email fails
          return;
        }
        
        console.log('Calling email function with session...');
        console.log('Function URL:', functionUrl);
        console.log('Session token present:', !!session.access_token);
        console.log('Session token value:', session.access_token);
        console.log('Session object:', session);
        
        const emailPayload = {
          toEmail: 'vkotrappa@gmail.com',
          toName: 'Admin',
          subject: messageTitle.trim(),
          body: messageDetail.trim(),
          senderName: 'Admin@PitchFork.com',
          companyName: company.name,
          messageType: 'investor'
        };
        
        console.log('Email payload:', emailPayload);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
        
        const emailResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(emailPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        console.log('Email response status:', emailResponse.status);
        console.log('Email response headers:', Object.fromEntries(emailResponse.headers.entries()));
        
        const responseText = await emailResponse.text();
        console.log('Email response body:', responseText);
        
        if (!emailResponse.ok) {
          console.error('Failed to send email notification:', responseText);
          // Don't fail the whole operation if email fails
        } else {
          console.log('Email notification sent successfully');
          console.log('Response data:', responseText);
          emailSent = true;
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the whole operation if email fails
      }

      // Only show success message if email was actually sent
      if (emailSent) {
        setMessageStatus({ type: 'success', text: 'Message sent successfully!' });
      } else {
        setMessageStatus({ type: 'warning', text: 'Message saved but email notification failed' });
      }
      setMessageTitle('');
      setMessageDetail('');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessageStatus(null);
        setShowMessageForm(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessageStatus({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Helper function to check if all 4 required analyze reports exist
  const hasAllRequiredAnalysisReports = (): boolean => {
    const requiredReports = ['product-analysis', 'team-analysis', 'market-analysis', 'financial-analysis'];
    const existingReportTypes = analysisReports.map(report => report.report_type.toLowerCase());
    return requiredReports.every(reportType => existingReportTypes.includes(reportType));
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading company details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Company not found'}</p>
            <Link 
              to="/dashboard" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
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
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold text-blue-600">
                Pitch Fork
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Navigation Menu */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Dashboard</Link>
                
                {/* Utilities Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUtilitiesMenu(!showUtilitiesMenu)}
                    className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                  >
                    Utilities <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showUtilitiesMenu && (
                    <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} z-50`}>
                      <Link to="/investor-preferences" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                        Investor Preferences
                      </Link>
                      <Link to="/edit-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                        Edit Prompts
                      </Link>
                    </div>
                  )}
                </div>
                
                <Link to="/help" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Help</Link>
                
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
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Venture Detail</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Detailed information about {company.name}
          </p>
        </div>

        {/* Message Status */}
        {messageStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            messageStatus.type === 'success' 
              ? 'bg-green-100 border-green-400 text-green-700' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <div className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              {messageStatus.text}
            </div>
          </div>
        )}

        {/* Company Name and Action Buttons */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">{company.name}</h2>
            
            {/* Action Buttons - Organized in 3 Rows */}
            <div className="space-y-3 mb-6">
              {(() => {
                // Get current status from analysis table
                const currentAnalysisStatus = analysis.length > 0 ? analysis[0].status : 'Submitted';
                
                // Row 1: Analysis buttons (in specific order)
                const row1Buttons = ['Analyze-Product', 'Analyze-Market', 'Analyze-Team', 'Analyze-Financials'];
                
                // Row 2: Create buttons
                const row2Buttons = ['Create-ScoreCard', 'Create-DetailReport', 'Create-DiligenceQuestions', 'Create-FounderReport'];
                
                // Row 3: Status buttons (based on current status)
                let row3Buttons: string[] = [];
                if (currentAnalysisStatus === 'Analyzed' || currentAnalysisStatus === 'In-Diligence') {
                  row3Buttons = ['Move to Diligence', 'Reject'];
                } else {
                  row3Buttons = ['Reject'];
                }
                
                const renderButton = (status: string) => {
                  const isActive = 
                    (status === 'Move to Diligence' && currentAnalysisStatus === 'In-Diligence') ||
                    (status === 'Invested' && currentAnalysisStatus === 'Invested') ||
                    (status !== 'Move to Diligence' && status !== 'Invested' && currentAnalysisStatus === status);
                  
                  // Determine button style based on type
                  const isAnalysisButton = status.startsWith('Analyze-');
                  const isCreateButton = status.startsWith('Create-');
                  
                  // Check if all required analysis reports exist (for Create buttons)
                  const allAnalysisReportsExist = hasAllRequiredAnalysisReports();
                  
                  // Check if this specific analysis report has been generated
                  const existingReportTypes = analysisReports.map(report => report.report_type.toLowerCase());
                  const isAnalysisComplete = 
                    (status === 'Analyze-Product' && existingReportTypes.includes('product-analysis')) ||
                    (status === 'Analyze-Team' && existingReportTypes.includes('team-analysis')) ||
                    (status === 'Analyze-Market' && existingReportTypes.includes('market-analysis')) ||
                    (status === 'Analyze-Financials' && existingReportTypes.includes('financial-analysis'));
                  
                  const isDisabled = isUpdating || 
                    (status === 'Analyze-Team' && isAnalyzingTeam) ||
                    (status === 'Analyze-Product' && isAnalyzingProduct) ||
                    (status === 'Analyze-Market' && isAnalyzingMarket) ||
                    (status === 'Analyze-Financials' && isAnalyzingFinancials) ||
                    (status === 'Create-ScoreCard' && (isCreatingScoreCard || !allAnalysisReportsExist)) ||
                    (status === 'Create-DetailReport' && (isCreatingDetailReport || !allAnalysisReportsExist)) ||
                    (status === 'Create-DiligenceQuestions' && (isCreatingDiligenceQuestions || !allAnalysisReportsExist)) ||
                    (status === 'Create-FounderReport' && (isCreatingFounderReport || !allAnalysisReportsExist)) ||
                    (status === 'Move to Diligence' && currentAnalysisStatus === 'In-Diligence');
                  
                  // Generate tooltip for Create buttons when disabled due to missing reports
                  // Also add tooltip for completed analysis buttons
                  const tooltipText = isCreateButton && !allAnalysisReportsExist
                    ? 'All 4 Analyze reports (Product, Team, Market, Financials) must be generated first'
                    : isAnalysisComplete
                    ? 'This analysis has been completed'
                    : undefined;
                  
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        if (status === 'Analyze-Team') {
                          handleAnalyzeTeam();
                        } else if (status === 'Analyze-Product') {
                          handleAnalyzeProduct();
                        } else if (status === 'Analyze-Market') {
                          handleAnalyzeMarket();
                        } else if (status === 'Analyze-Financials') {
                          handleAnalyzeFinancials();
                        } else if (status === 'Create-ScoreCard') {
                          handleCreateScoreCard();
                        } else if (status === 'Create-DetailReport') {
                          handleCreateDetailReport();
                        } else if (status === 'Create-DiligenceQuestions') {
                          handleCreateDiligenceQuestions();
                        } else if (status === 'Create-FounderReport') {
                          handleCreateFounderReport();
                        } else {
                          handleStatusChange(status);
                        }
                      }}
                      disabled={isDisabled}
                      title={tooltipText}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isAnalysisButton && isAnalysisComplete
                            ? isDark
                              ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                              : 'bg-gray-400 text-white hover:bg-gray-500'
                            : isAnalysisButton
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : isCreateButton
                                ? (status === 'Create-ScoreCard' && existingReportTypes.includes('scorecard')) ||
                                  (status === 'Create-DetailReport' && existingReportTypes.includes('detail-report')) ||
                                  (status === 'Create-DiligenceQuestions' && existingReportTypes.includes('diligence-questions')) ||
                                  (status === 'Create-FounderReport' && existingReportTypes.includes('founder-report'))
                                  ? isDark
                                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                    : 'bg-gray-400 text-white hover:bg-gray-500'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                                : isDark
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {isDisabled && status.startsWith('Analyze-') ? 'Analyzing...' : 
                       isDisabled && status.startsWith('Create-') ? 'Creating...' :
                       isUpdating ? 'Updating...' : 
                       status.replace(/-/g, ' ')}
                    </button>
                  );
                };
                
                return (
                  <>
                    {/* Row 1: Analysis Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {row1Buttons.map(renderButton)}
                    </div>
                    
                    {/* Row 2: Create Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {row2Buttons.map(renderButton)}
                    </div>
                    
                    {/* Info message when Create buttons are disabled */}
                    {!hasAllRequiredAnalysisReports() && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        ℹ️ <strong>Note:</strong> All 4 Analyze reports (Product, Team, Market, Financials) must be generated before you can create ScoreCard, DetailReport, DiligenceQuestions, or FounderReport.
                      </div>
                    )}
                    
                    {/* Row 3: Status Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {row3Buttons.map(renderButton)}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Current Status, Recommendation, and Reason Display */}
            <div className="space-y-3">
              
              {/* Current Status */}
              <div>
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Current Status:{' '}
                </span>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  {analysis.length > 0 ? analysis[0].status : 'Submitted'}
                </span>
              </div>

              {/* Recommendation */}
              {analysis.length > 0 && analysis[0].recommendation && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Recommendation:{' '}
                  </span>
                  <span className={`text-sm font-medium ${
                    analysis[0].recommendation === 'Invest' || analysis[0].recommendation === 'Analyze' ? 'text-green-600' :
                    analysis[0].recommendation === 'Consider' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {analysis[0].recommendation}
                  </span>
                </div>
              )}

              {/* Recommendation Reason */}
              {analysis.length > 0 && analysis[0].recommendation_reason && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Recommendation Reason:{' '}
                  </span>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {analysis[0].recommendation_reason}
                  </span>
                </div>
              )}

              {/* Quick Message Input */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="Type a message to send to founder..."
                    className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && messageTitle.trim()) {
                        handleQuickMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleQuickMessage}
                    disabled={isSendingMessage || !messageTitle.trim()}
                    className="px-4 py-2 rounded-lg font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {isSendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        {showMessageForm && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-green-600 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Send Message to Founder
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Message Title
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="Enter message title"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Message
                  </label>
                  <textarea
                    value={messageDetail}
                    onChange={(e) => setMessageDetail(e.target.value)}
                    placeholder="Enter your message"
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageTitle.trim() || !messageDetail.trim()}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSendingMessage ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMessageForm(false);
                      setMessageTitle('');
                      setMessageDetail('');
                      setMessageStatus(null);
                    }}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      isDark 
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results Section */}
        {analysis.length > 0 && (analysis[0].status === 'Screened' || analysis[0].status === 'Analyzed' || analysis[0].status === 'In-Diligence') && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-blue-600 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analysis Results
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analysis[0].overall_score ? `${analysis[0].overall_score}/10` : 'Pending'}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Overall Score
                  </div>
                </div>
                
                {/* Recommendation */}
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    analysis[0].recommendation === 'Invest' || analysis[0].recommendation === 'Analyze' ? 'text-green-600' :
                    analysis[0].recommendation === 'Consider' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {analysis[0].recommendation || 'Pending'}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Recommendation
                  </div>
                </div>
                
                {/* Analysis Date */}
                <div className="text-center">
                  <div className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    {analysis[0].analyzed_at 
                      ? new Date(analysis[0].analyzed_at).toLocaleDateString()
                      : analysisReports.length > 0 
                        ? new Date(analysisReports[0].generated_at).toLocaleDateString()
                        : 'N/A'
                    }
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Analysis Date
                  </div>
                </div>
              </div>
              
              {/* Analysis History */}
              {analysis[0].history && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3 flex items-center`}>
                    📋 Analysis History
                  </h3>
                  <div className="space-y-2">
                    {analysis[0].history.split('\n').map((entry, index) => {
                      if (!entry.trim()) return null;
                      const [date, ...action] = entry.split(':');
                      return (
                        <div key={index} className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex`}>
                          <span className="font-medium min-w-[120px]">{date}:</span>
                          <span className="ml-2">{action.join(':')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Analysis Results Section */}
        {teamAnalysisResult && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-purple-600 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Team Analysis Results
              </h2>
            </div>
            <div className="p-6">
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
                {teamAnalysisResult}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setTeamAnalysisResult(null)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isDark 
                      ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Hide Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Reports Section - Always Visible if Reports Exist */}
        {analysisReports.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-blue-600 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Generated Analysis Reports
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisReports.map((report) => (
                  <div key={report.id} className={`p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className={`font-semibold capitalize mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {report.report_type === 'summary' ? '📊 Summary Report' :
                           report.report_type === 'detailed' ? '📈 Detailed Analysis' :
                           report.report_type === 'team-analysis' ? 'Team Analysis' :
                           report.report_type === 'feedback' ? '💬 Company Feedback' :
                           report.report_type.replace(/-/g, ' ')}
                        </h4>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                          {report.file_name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Generated: {new Date(report.generated_at).toLocaleDateString()} {new Date(report.generated_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadReport(report)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors flex-shrink-0"
                          title="Download report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                          title="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Documents Section - Always Visible */}
        {documents.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-blue-600 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Uploaded Documents
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className={`p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.document_name}</h4>
                        {doc.description && (
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                            {doc.description}
                          </p>
                        )}
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Uploaded: {new Date(doc.date_added).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors ml-2 flex-shrink-0"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Company Information Card */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-blue-600 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Company Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Industry */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Industry
                </label>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                  {company.industry || 'Not specified'}
                </p>
              </div>

              {/* Date Submitted */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Date Submitted
                </label>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {new Date(company.date_submitted).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Funding Sought */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Funding Sought
                </label>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                  {company.funding_terms || 'Not specified'}
                </p>
              </div>

              {/* Revenue */}
              {company.revenue && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Revenue
                  </label>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'} font-semibold`}>
                    {company.revenue}
                  </p>
                </div>
              )}

              {/* Valuation */}
              {company.valuation && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Valuation
                  </label>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'} font-semibold`}>
                    {company.valuation}
                  </p>
                </div>
              )}

              {/* Website URL */}
              {company.url && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Website
                  </label>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    <a 
                      href={company.url.startsWith('http') ? company.url : `https://${company.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors underline"
                    >
                      {company.url}
                    </a>
                  </p>
                </div>
              )}

              {/* Address */}
              {company.address && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Address
                  </label>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {company.address}
                  </p>
                </div>
              )}

              {/* Country */}
              {company.country && (
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Country
                  </label>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {company.country}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                  Description
                </label>
                <div className="flex items-start">
                  <FileText className="w-4 h-4 mr-2 text-orange-500 mt-1 flex-shrink-0" />
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                    {company.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-blue-600">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Contact Name */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Contact Name
                    </label>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-orange-500" />
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {company.contact_name || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Email
                    </label>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-orange-500" />
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {company.email_1 ? (
                          <a 
                            href={`mailto:${company.email_1}`} 
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {company.email_1}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Phone
                    </label>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-orange-500" />
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {company.phone_1 ? (
                          <a 
                            href={`tel:${company.phone_1}`} 
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {company.phone_1}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

export default VentureDetail;