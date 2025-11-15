import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, User, Mail, Phone, FileText, ChevronDown, ChevronUp, MessageCircle, Send, Download, BarChart3, Users, Trash2, Eye, X, Loader2, Pencil } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';
import { calculateMatchScore, CompanyRecord, InvestorDetailRecord } from './InvestorCompanyMatch';

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
  industry_sectors?: Array<{sector: string, sub_sector: string}>;
  geography?: string;
  investment_round?: number;
  terms?: string;
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
  match_score?: number | string | null;
  investor_details?: {
    name: string;
    firm_name?: string;
  };
  scorecard_summary?: ScorecardSummaryData | null;
}

interface AnalysisReport {
  id: string;
  report_type: string;
  file_name: string;
  file_path: string;
  generated_at: string;
  product_score?: string;
  market_score?: string;
  team_score?: string;
  financials_score?: string;
  valuation_score?: string;
  score_card?: string;
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
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
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
  const [isAnalyzingValuation, setIsAnalyzingValuation] = useState(false);
  const [isCreatingScoreCard, setIsCreatingScoreCard] = useState(false);
  const [isCreatingDetailReport, setIsCreatingDetailReport] = useState(false);
  const [isCreatingDiligenceQuestions, setIsCreatingDiligenceQuestions] = useState(false);
  const [isCreatingFounderReport, setIsCreatingFounderReport] = useState(false);
  const [isCreatingDetailReportText, setIsCreatingDetailReportText] = useState(false);
  const [detailReportText, setDetailReportText] = useState<string | null>(null);
  const [detailReportTextUrl, setDetailReportTextUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [customPrompts, setCustomPrompts] = useState<Set<string>>(new Set());
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchDetails, setMatchDetails] = useState<{ score: number; summary: string[] } | null>(null);

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
        await loadInvestorPrompts();
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

  const loadInvestorPrompts = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return;
      }

      const { data, error } = await supabase
        .from('investor_prompts')
        .select('report_name')
        .eq('user_id', currentUser.id)
        .not('custom_prompt', 'is', null);

      if (error) {
        console.error('Error loading investor prompts:', error);
        return;
      }

      // Create a Set of report names that have custom prompts
      const promptSet = new Set<string>();
      if (data) {
        data.forEach(prompt => {
          promptSet.add(prompt.report_name);
        });
      }
      
      setCustomPrompts(promptSet);
    } catch (error) {
      console.error('Error loading investor prompts:', error);
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

  const handleViewPdf = async (report: AnalysisReport) => {
    try {
      setMessageStatus({ type: 'success', text: 'Loading PDF...' });
      
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
          expires_in: 3600 // 1 hour for viewing
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setMessageStatus({ 
          type: 'error', 
          text: `Failed to load PDF: ${errorData.error || response.statusText}` 
        });
        return;
      }

      const signedUrlResult = await response.json();
      
      if (!signedUrlResult?.signed_url) {
        setMessageStatus({ type: 'error', text: 'Failed to generate view link' });
        return;
      }

      setPdfUrl(signedUrlResult.signed_url);
      setPdfFileName(report.file_name);
      setShowPdfModal(true);
      setMessageStatus(null);
      
      // Reset modal size when opening
      setModalSize({ width: 0, height: 0 });
    } catch (error) {
      console.error('Error loading PDF:', error);
      setMessageStatus({ type: 'error', text: 'Failed to load PDF' });
    }
  };

  // Handle resize start
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !showPdfModal) return;
      
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const maxWidth = windowWidth - 20;
      const maxHeight = windowHeight - 20;
      
      // Calculate new size based on mouse delta from start position
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = resizeStart.width + deltaX;
      let newHeight = resizeStart.height + deltaY;
      
      newWidth = Math.max(800, Math.min(newWidth, maxWidth));
      newHeight = Math.max(600, Math.min(newHeight, maxHeight));
      
      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, showPdfModal]);

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
      if (newStatus === 'To Diligence') {
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
      } else if (newStatus === 'To Diligence') {
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

  // Helper function to parse scorecard text format
  // Expected format:
  // First line: "8.5/10: Product"
  // Subsequent lines: "8.1: Product-Market Fit", "9.1: IP/Defensibility"
  const parseScoreCard = (scoreText: string): { title: string; overallScore: string; categories: Array<{ name: string; score: string }> } | null => {
    if (!scoreText || !scoreText.trim()) {
      return null;
    }
    
    try {
      const lines = scoreText.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return null;
      }
      
      // First line should be "8.5/10: Product" format
      const firstLine = lines[0].trim();
      const headerMatch = firstLine.match(/^(\d+\.?\d*)\/10:\s*(.+)$/);
      
      if (!headerMatch) {
        // Try alternative format: "8.5: Product" (without /10)
        const altMatch = firstLine.match(/^(\d+\.?\d*):\s*(.+)$/);
        if (!altMatch) {
          return null;
        }
        
        const overallScore = altMatch[1].trim();
        const title = altMatch[2].trim();
        
        // Remaining lines should be "8.1: Category Name" format
        const categories: Array<{ name: string; score: string }> = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          const categoryMatch = line.match(/^(\d+\.?\d*):\s*(.+)$/);
          if (categoryMatch) {
            categories.push({
              name: categoryMatch[2].trim(),
              score: categoryMatch[1].trim()
            });
          }
        }
        
        return {
          title: title,
          overallScore: overallScore,
          categories: categories
        };
      }
      
      const overallScore = headerMatch[1].trim();
      const title = headerMatch[2].trim();
      
      // Remaining lines should be "8.1: Category Name" format
      const categories: Array<{ name: string; score: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const categoryMatch = line.match(/^(\d+\.?\d*):\s*(.+)$/);
        if (categoryMatch) {
          categories.push({
            name: categoryMatch[2].trim(),
            score: categoryMatch[1].trim()
          });
        }
      }
      
      return {
        title: title,
        overallScore: overallScore,
        categories: categories
      };
    } catch (error) {
      console.error('Error parsing scorecard:', error);
      return null;
    }
  };

  // Helper function to get scorecard data for a report type
  const getScoreCardData = (reportType: string) => {
    // Find the report that matches this type
    const report = analysisReports.find(r => r.report_type === reportType);
    if (!report) {
      return null;
    }
    
    // Check if score_card field exists and is not blank
    if (!report.score_card || report.score_card.trim().length === 0) {
      return null;
    }
    
    // Check if file_path exists (indicating the report file should exist)
    if (!report.file_path || report.file_path.trim().length === 0) {
      return null;
    }
    
    // Use score_card field (new centralized approach)
    return parseScoreCard(report.score_card);
  };

  // Helper function to fetch scorecard HTML content from PDF
  const fetchScorecardHtml = async (report: AnalysisReport) => {
    if (!report.file_path) return null;
    
    try {
      // Get public URL for the PDF
      const { data: urlData } = supabase.storage
        .from('analysis-output-docs')
        .getPublicUrl(report.file_path);
      
      if (!urlData?.publicUrl) return null;
      
      // Fetch the PDF and convert to blob URL for iframe display
      const response = await fetch(urlData.publicUrl);
      if (!response.ok) return null;
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return blobUrl;
    } catch (error) {
      console.error('Error fetching scorecard PDF:', error);
      return null;
    }
  };

  // Toggle scorecard expansion
  const toggleScorecardExpansion = async (reportId: string, report: AnalysisReport) => {
    const isExpanded = expandedScorecards.has(reportId);
    
    if (isExpanded) {
      // Collapse
      setExpandedScorecards(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
      // Clean up blob URL if exists
      if (scorecardHtmlContent[reportId]) {
        URL.revokeObjectURL(scorecardHtmlContent[reportId]);
        setScorecardHtmlContent(prev => {
          const newContent = { ...prev };
          delete newContent[reportId];
          return newContent;
        });
      }
    } else {
      // Expand - fetch HTML content
      setExpandedScorecards(prev => new Set(prev).add(reportId));
      const htmlUrl = await fetchScorecardHtml(report);
      if (htmlUrl) {
        setScorecardHtmlContent(prev => ({ ...prev, [reportId]: htmlUrl }));
      }
    }
  };

  // Helper function to get scorecard display name
  const getScorecardDisplayName = (reportType: string) => {
    if (reportType === 'scorecard' || reportType === 'scorecard-analysis') {
      return '📊 Score Card';
    }
    return reportType.replace(/-/g, ' ');
  };

  const getAnalysisFunctionUrl = async (baseFunctionName: string = 'analyze-company'): Promise<string> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        // Default to OpenAI if no user
        return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${baseFunctionName}`;
      }

      // Check LLM preference
      const { data: llmPreference, error } = await supabase
        .from('llm_preferences')
        .select('preferred_llm')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching LLM preference:', error);
        // Default to OpenAI on error
        return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${baseFunctionName}`;
      }

      const preferredLlm = llmPreference?.preferred_llm || 'OpenAI';
      console.log(`User LLM preference: ${preferredLlm}`);

      if (preferredLlm === 'Claude' && baseFunctionName === 'analyze-company') {
        return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-claude`;
      }

      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${baseFunctionName}`;
    } catch (error) {
      console.error('Error getting analysis function URL:', error);
      // Default to OpenAI on error
      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${baseFunctionName}`;
    }
  };

  // Generic analysis handler for all analysis types
  const handleAnalysis = async (analysisType: 'team' | 'product' | 'market' | 'financial' | 'valuation') => {
    if (!company) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    const typeConfig = {
      team: { setLoading: setIsAnalyzingTeam, promptName: 'Team-Analysis', label: 'Team', historyLabel: 'Analyze-Team' },
      product: { setLoading: setIsAnalyzingProduct, promptName: 'Product-Analysis', label: 'Product', historyLabel: 'Analyze-Product' },
      market: { setLoading: setIsAnalyzingMarket, promptName: 'Market-Analysis', label: 'Market', historyLabel: 'Analyze-Market' },
      financial: { setLoading: setIsAnalyzingFinancials, promptName: 'Financial-Analysis', label: 'Financial', historyLabel: 'Analyze-Financials' },
      valuation: { setLoading: setIsAnalyzingValuation, promptName: 'Valuation-Analysis', label: 'Valuation', historyLabel: 'Analyze-Valuation' },
    };

    const config = typeConfig[analysisType];

    try {
      config.setLoading(true);
      setMessageStatus(null);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessageStatus({ type: 'error', text: `You must be logged in to perform ${config.label.toLowerCase()} analysis` });
        config.setLoading(false);
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
          config.setLoading(false);
          return;
        }
        analysisId = newAnalysis.id;
      }

      let requestBody: any;

      // For valuation analysis, use the most recent analysis reports instead of documents
      if (analysisType === 'valuation') {
        // Fetch the most recent analysis report from each category
        const reportTypes = ['product-analysis', 'market-analysis', 'team-analysis', 'financial-analysis'];
        const recentAnalysisReports: Array<{ id: string; report_type: string; file_path: string; generated_at: string; }> = [];

        for (const reportType of reportTypes) {
          const { data: report, error } = await supabase
            .from('analysis_reports')
            .select('id, report_type, file_path, generated_at')
            .eq('analysis_id', analysisId)
            .eq('report_type', reportType)
            .not('file_path', 'is', null)
            .neq('file_path', '')
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(`Error fetching ${reportType}:`, error);
          } else if (report && report.file_path) {
            recentAnalysisReports.push({
              id: report.id,
              report_type: report.report_type,
              file_path: report.file_path,
              generated_at: report.generated_at
            });
          }
        }

        if (recentAnalysisReports.length === 0) {
          setMessageStatus({ type: 'error', text: 'No analysis reports available. Please run at least one analysis (Product, Market, Team, or Financial) first.' });
          config.setLoading(false);
          return;
        }

        console.log('Most recent analysis reports fetched for valuation:', recentAnalysisReports);

        requestBody = {
          companyId: company.id,
          companyName: company.name,
          analysisId: analysisId,
          analysisType: analysisType,
          analysisReports: recentAnalysisReports,
          documents: [] // Explicitly set to empty array for valuation
        };
      } else {
        // For other analysis types, use company documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .eq('company_id', company.id);

        if (documentsError) {
          console.error('Error fetching company documents:', documentsError);
          setMessageStatus({ type: 'error', text: 'Failed to fetch company documents' });
          config.setLoading(false);
          return;
        }

        if (!documentsData || documentsData.length === 0) {
          setMessageStatus({ type: 'error', text: `No documents found for ${config.label.toLowerCase()} analysis` });
          config.setLoading(false);
          return;
        }

        console.log('Documents to analyze:', documentsData.map(doc => ({
          id: doc.id,
          name: doc.document_name,
          path: doc.path
        })));

        requestBody = {
          companyId: company.id,
          companyName: company.name,
          analysisId: analysisId,
          analysisType: analysisType,
          documents: documentsData.map(doc => ({
            id: doc.id,
            name: doc.document_name,
            path: doc.path
          }))
        };
      }
      
      console.log('Calling analyze-company-background function with:', {
        companyId: requestBody.companyId,
        companyName: requestBody.companyName,
        analysisId: requestBody.analysisId,
        analysisType: requestBody.analysisType,
        documentsCount: requestBody.documents?.length || 0,
        analysisReportsCount: requestBody.analysisReports?.length || 0,
      });

      // Always call analyze-company-background - it handles LLM routing internally
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-background`;
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
        config.setLoading(false);
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
          
          if (newStatus === 'Analyzed') {
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

      // Poll for report completion every 5 seconds
      const expectedReportType = `${analysisType}-analysis`;
      const pollInterval = setInterval(async () => {
        // Reload analysis reports to check for new reports
        const { data: reportsData } = await supabase
          .from('analysis_reports')
          .select('report_type, analysis_id')
          .eq('analysis_id', analysisId);
        
        if (reportsData) {
          const hasReport = reportsData.some(
            report => report.report_type.toLowerCase() === expectedReportType
          );
          
          if (hasReport) {
            console.log(`${config.label} analysis report found!`);
            clearInterval(pollInterval);
            config.setLoading(false);
            setMessageStatus({ type: 'success', text: `${config.label} analysis completed successfully!` });
            
            // Reload analysis reports to update UI
            await loadAnalysisReports(company.id);
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
              setMessageStatus(null);
            }, 5000);
          }
        }
      }, 5000); // Poll every 5 seconds

      // Stop polling after 10 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (config.setLoading) {
          config.setLoading(false);
        }
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error(`Error performing ${config.label.toLowerCase()} analysis:`, error);
      setMessageStatus({ type: 'error', text: `An unexpected error occurred during ${config.label.toLowerCase()} analysis` });
      config.setLoading(false);
    }
  };

  // Wrapper functions for each analysis type
  const handleAnalyzeTeam = () => handleAnalysis('team');
  const handleAnalyzeProduct = () => handleAnalysis('product');
  const handleAnalyzeMarket = () => handleAnalysis('market');
  const handleAnalyzeFinancials = () => handleAnalysis('financial');
  const handleAnalyzeValuation = () => handleAnalysis('valuation');


  const handleCreateScoreCard = async () => {
    if (!company || !id) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    setIsCreatingScoreCard(true);
    setMessageStatus({ type: 'success', text: 'Starting score card creation...' });
    
    try {
      console.log('Creating score card for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Fetch the most recent analysis report from each category
      const reportTypes = ['product-analysis', 'market-analysis', 'team-analysis', 'financial-analysis'];
      const recentAnalysisReports: Array<{ id: string; report_type: string; file_path: string; generated_at: string; }> = [];

      for (const reportType of reportTypes) {
        const { data: report, error } = await supabase
          .from('analysis_reports')
          .select('id, report_type, file_path, generated_at')
          .eq('analysis_id', analysisId)
          .eq('report_type', reportType)
          .not('file_path', 'is', null)
          .neq('file_path', '')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(`Error fetching ${reportType}:`, error);
        } else if (report && report.file_path) {
          recentAnalysisReports.push({
            id: report.id,
            report_type: report.report_type,
            file_path: report.file_path,
            generated_at: report.generated_at
          });
        }
      }

      if (recentAnalysisReports.length === 0) {
        setMessageStatus({ type: 'error', text: 'No analysis reports available. Please run at least one analysis (Product, Market, Team, or Financial) first.' });
        setIsCreatingScoreCard(false);
        return;
      }

      console.log('Most recent analysis reports fetched:', recentAnalysisReports);

      // Call the analyze-company-background function with scorecard type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use background function to avoid timeout issues
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-background`;
      console.log('Calling background analysis function for scorecard:', functionUrl);

      const response = await fetch(
        functionUrl,
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
            analysisReports: recentAnalysisReports
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
      console.log('Score card creation initiated:', result);

      // Background function returns immediately, report will be generated asynchronously
      // Reload the analysis reports after a short delay to show the new score card
      setTimeout(async () => {
        await loadAnalysisReports(id);
      }, 2000);
      
      setMessageStatus({ type: 'success', text: 'Score card creation started! The report will be generated in the background. Please refresh the page in a few moments to see the new report.' });
    } catch (error) {
      console.error('Error creating score card:', error);
      setMessageStatus({ type: 'error', text: `Failed to create score card: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsCreatingScoreCard(false);
    }
  };

  const handleCreateDetailReport = async () => {
    if (!company || !id) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    setIsCreatingDetailReport(true);
    setMessageStatus({ type: 'success', text: 'Creating detailed report from existing analyses...' });
    
    try {
      console.log('Creating detail report for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';
      
      if (!analysisId) {
        // Create analysis record if it doesn't exist
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
          throw new Error('Failed to create analysis record');
        }
        analysisId = newAnalysis.id;
      }

      // Fetch the most recent analysis reports from Product, Market, Team, Financials, and Valuation
      const reportTypes = ['product-analysis', 'market-analysis', 'team-analysis', 'financial-analysis', 'valuation-analysis'];
      const recentAnalysisReports: Array<{ id: string; report_type: string; file_path: string; generated_at: string; }> = [];

      for (const reportType of reportTypes) {
        const { data: report, error } = await supabase
          .from('analysis_reports')
          .select('id, report_type, file_path, generated_at')
          .eq('analysis_id', analysisId)
          .eq('report_type', reportType)
          .not('file_path', 'is', null)
          .neq('file_path', '')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(`Error fetching ${reportType}:`, error);
        } else if (report && report.file_path) {
          recentAnalysisReports.push({
            id: report.id,
            report_type: report.report_type,
            file_path: report.file_path,
            generated_at: report.generated_at
          });
        }
      }

      if (recentAnalysisReports.length === 0) {
        setMessageStatus({ type: 'error', text: 'No analysis reports available. Please run at least one analysis (Product, Market, Team, Financials, or Valuation) first.' });
        setIsCreatingDetailReport(false);
        return;
      }

      console.log('Most recent analysis reports fetched:', recentAnalysisReports);

      // Call the analyze-company-background function with detail-report type
      // Pass existing analysis reports instead of documents
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use background function to avoid timeout issues
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-background`;
      console.log('Calling background analysis function for detail report:', functionUrl);

      const response = await fetch(
        functionUrl,
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
            analysisReports: recentAnalysisReports
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
      console.log('Detail report creation initiated:', result);

      // Background function returns immediately, report will be generated asynchronously
      // Reload the analysis reports after a short delay to show the new detail report
      setTimeout(async () => {
        await loadAnalysisReports(id);
      }, 2000);
      
      setMessageStatus({ type: 'success', text: 'Detail report creation started! The report will be generated in the background using your existing analyses. Please refresh the page in a few moments to see the new report.' });
    } catch (error) {
      console.error('Error creating detail report:', error);
      setMessageStatus({ type: 'error', text: `Failed to create detail report: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsCreatingDetailReport(false);
    }
  };

  const handleCreateDetailReportText = async () => {
    if (!company || !id) {
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }
    setIsCreatingDetailReportText(true);
    try {
      const { data, error } = await supabase.functions.invoke('detail-report-text', {
        body: { company_id: id },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.report_text) {
        throw new Error('Detail report text was not generated.');
      }

      setDetailReportText(data.report_text as string);
      setDetailReportTextUrl(data.report?.download_url ?? null);
      setMessageStatus({ type: 'success', text: 'Detail report text generated successfully. Download link is ready below.' });
    } catch (error) {
      console.error('Error generating detail report text:', error);
      setMessageStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to generate detail report text.',
      });
    } finally {
      setIsCreatingDetailReportText(false);
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
        .filter(report => report.file_path) // Filter out reports with missing paths
        .map(report => ({
          type: report.report_type,
          path: report.file_path,
          generated_at: report.generated_at
        }));

      console.log('Existing reports for diligence questions:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);

      // Call the analyze-company edge function with diligence-questions type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get function URL based on LLM preference
      const functionUrl = await getAnalysisFunctionUrl('analyze-company');
      console.log('Calling analysis function:', functionUrl);

      const response = await fetch(
        functionUrl,
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
      setMessageStatus({ type: 'error', text: 'Company information not available' });
      return;
    }

    if (analysisReports.length === 0) {
      setMessageStatus({ type: 'error', text: 'No analysis reports available. Please run at least one analysis first.' });
      return;
    }

    setIsCreatingFounderReport(true);
    setMessageStatus({ type: 'success', text: 'Starting founder report creation...' });
    
    try {
      console.log('Creating founder report for company:', company.name);

      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get analysis ID
      let analysisId = analysis.length > 0 ? analysis[0].id : '';

      // Prepare analysis reports for the AI
      const reportsSummary = analysisReports
        .filter(report => report.file_path) // Filter out reports with missing paths
        .map(report => ({
          id: report.id,
          report_type: report.report_type,
          file_path: report.file_path,
          generated_at: report.generated_at
        }));

      console.log('Analysis reports for founder report:', reportsSummary);
      console.log('Filtered reports count:', reportsSummary.length, 'out of', analysisReports.length);

      if (reportsSummary.length === 0) {
        setMessageStatus({ type: 'error', text: 'No valid analysis reports available. Please run at least one analysis first.' });
        setIsCreatingFounderReport(false);
        return;
      }

      // Call the analyze-company-background function with founder-report type
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use background function to avoid timeout issues
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-background`;
      console.log('Calling background analysis function for founder report:', functionUrl);

      const response = await fetch(
        functionUrl,
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
            analysisReports: reportsSummary
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
      console.log('Founder report creation initiated:', result);

      // Background function returns immediately, report will be generated asynchronously
      // Reload the analysis reports after a short delay to show the new founder report
      setTimeout(async () => {
        await loadAnalysisReports(id);
      }, 2000);
      
      setMessageStatus({ type: 'success', text: 'Founder report creation started! The report will be generated in the background. Please refresh the page in a few moments to see the new report.' });
    } catch (error) {
      console.error('Error creating founder report:', error);
      setMessageStatus({ type: 'error', text: `Failed to create founder report: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm font-semibold`}
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Venture Detail</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {company.description || 'No description available.'}
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

        {/* Detail Report Text Output */}
        {detailReportText && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-blue-600">Detail Report (Text)</h3>
              <button
                onClick={() => {
                  setDetailReportText(null);
                  setDetailReportTextUrl(null);
                }}
                className="text-sm text-red-500 hover:text-red-600 font-semibold"
              >
                Clear
              </button>
            </div>
            {detailReportTextUrl && (
              <div className="mb-4">
                <a
                  href={detailReportTextUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </a>
              </div>
            )}
            <div
              className={`whitespace-pre-wrap text-sm leading-6 rounded-lg p-4 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}
              style={{ maxHeight: '400px', overflowY: 'auto' }}
            >
              {detailReportText}
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
                const row1Buttons = ['Analyze-Product', 'Analyze-Market', 'Analyze-Team', 'Analyze-Financials', 'Analyze-Valuation'];
                
                // Row 2: Create buttons
                const row2Buttons = ['Create-ScoreCard', 'Create-DetailReport', 'Create-DiligenceQuestions', 'Create-FounderReport'];
                
                // Row 3: Status buttons (based on current analysis status)
                let row3Buttons: string[] = [];
                if (currentAnalysisStatus === 'Analyzed' || currentAnalysisStatus === 'In-Diligence') {
                  row3Buttons = ['To Diligence', 'Reject'];
                } else {
                  row3Buttons = ['Reject'];
                }
                
                // Map button statuses to report names for custom prompt check
                const statusToReportName: Record<string, string> = {
                  'Analyze-Product': 'Product-Analysis',
                  'Analyze-Market': 'Market-Analysis',
                  'Analyze-Team': 'Team-Analysis',
                  'Analyze-Financials': 'Financial-Analysis',
                  'Analyze-Valuation': 'Valuation-Analysis',
                };
                
                // Helper function to get display text for buttons
                const getButtonDisplayText = (status: string, hasCustomPrompt: boolean): string => {
                  let displayText = '';
                  
                  if (status.startsWith('Analyze-')) {
                    displayText = status.replace('Analyze-', '');
                  } else if (status.startsWith('Create-')) {
                    displayText = status.replace('Create-', '');
                    // Format the display text nicely - add space before capital letters
                    displayText = displayText.replace(/([a-z])([A-Z])/g, '$1 $2');
                  } else {
                    displayText = status.replace(/-/g, ' ');
                  }
                  
                  return hasCustomPrompt ? `* ${displayText}` : displayText;
                };
                
                const renderButton = (status: string) => {
                  const isActive = 
                    (status === 'To Diligence' && currentAnalysisStatus === 'In-Diligence') ||
                    (status === 'Invested' && currentAnalysisStatus === 'Invested') ||
                    (status !== 'To Diligence' && status !== 'Invested' && currentAnalysisStatus === status);
                  
                  // Determine button style based on type
                  const isAnalysisButton = status.startsWith('Analyze-');
                  const isCreateButton = status.startsWith('Create-');
                  // Check if this button has a custom prompt
                  const reportName = statusToReportName[status];
                  const hasCustomPrompt = reportName ? customPrompts.has(reportName) : false;
                  
                  // Check if this specific analysis report has been generated
                  const existingReportTypes = analysisReports.map(report => report.report_type.toLowerCase());
                  const isAnalysisComplete = 
                    (status === 'Analyze-Product' && existingReportTypes.includes('product-analysis')) ||
                    (status === 'Analyze-Team' && existingReportTypes.includes('team-analysis')) ||
                    (status === 'Analyze-Market' && existingReportTypes.includes('market-analysis')) ||
                    (status === 'Analyze-Financials' && existingReportTypes.includes('financial-analysis')) ||
                    (status === 'Analyze-Valuation' && existingReportTypes.includes('valuation-analysis'));
                  
                  // Check if Create button report exists
                  const isCreateReportComplete =
                    (status === 'Create-ScoreCard' && existingReportTypes.includes('scorecard')) ||
                    (status === 'Create-DetailReport' && existingReportTypes.includes('detail-report')) ||
                    (status === 'Create-DiligenceQuestions' && existingReportTypes.includes('diligence-questions')) ||
                    (status === 'Create-FounderReport' && existingReportTypes.includes('founder-report'));
                  
                  // Check if Create button is currently running
                  const isCreateButtonRunning =
                    (status === 'Create-ScoreCard' && isCreatingScoreCard) ||
                    (status === 'Create-DetailReport' && isCreatingDetailReport) ||
                    (status === 'Create-DiligenceQuestions' && isCreatingDiligenceQuestions) ||
                    (status === 'Create-FounderReport' && isCreatingFounderReport);
                  
                  const isDisabled = isUpdating || 
                    (status === 'Analyze-Team' && isAnalyzingTeam) ||
                    (status === 'Analyze-Product' && isAnalyzingProduct) ||
                    (status === 'Analyze-Market' && isAnalyzingMarket) ||
                    (status === 'Analyze-Financials' && isAnalyzingFinancials) ||
                    (status === 'Analyze-Valuation' && isAnalyzingValuation) ||
                    (status === 'Create-ScoreCard' && isCreatingScoreCard) ||
                    (status === 'Create-DetailReport' && isCreatingDetailReport) ||
                    (status === 'Create-DetailReportText' && isCreatingDetailReportText) ||
                    (status === 'Create-DiligenceQuestions' && isCreatingDiligenceQuestions) ||
                    (status === 'Create-FounderReport' && isCreatingFounderReport) ||
                    (status === 'To Diligence' && currentAnalysisStatus === 'In-Diligence');
                  
                  // Generate tooltip for completed analysis buttons
                  const tooltipText = isAnalysisComplete
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
                        } else if (status === 'Analyze-Valuation') {
                          handleAnalyzeValuation();
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
                          : isAnalysisButton && (
                                  (status === 'Analyze-Team' && isAnalyzingTeam) ||
                                  (status === 'Analyze-Product' && isAnalyzingProduct) ||
                                  (status === 'Analyze-Market' && isAnalyzingMarket) ||
                                  (status === 'Analyze-Financials' && isAnalyzingFinancials) ||
                                  (status === 'Analyze-Valuation' && isAnalyzingValuation)
                                )
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                              : isAnalysisButton && isAnalysisComplete
                                ? 'bg-green-600 text-white hover:bg-green-700'
                              : isAnalysisButton
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : isCreateButton && isCreateButtonRunning
                                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : isCreateButton && isCreateReportComplete
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                : isCreateButton
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : isDark
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {(status.startsWith('Analyze-') && (
                          (status === 'Analyze-Team' && isAnalyzingTeam) ||
                          (status === 'Analyze-Product' && isAnalyzingProduct) ||
                          (status === 'Analyze-Market' && isAnalyzingMarket) ||
                          (status === 'Analyze-Financials' && isAnalyzingFinancials) ||
                          (status === 'Analyze-Valuation' && isAnalyzingValuation)
                        )) ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </span>
                        ) :
                       (status.startsWith('Create-') && isCreateButtonRunning) ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </span>
                        ) :
                       isUpdating ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </span>
                        ) : 
                       getButtonDisplayText(status, hasCustomPrompt)}
                    </button>
                  );
                };
                
                return (
                  <>
                    {/* Row 1: Analysis Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'}`}>Analyze:</span>
                      {row1Buttons.map(renderButton)}
                    </div>
                    
                    {/* Row 2: Create Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'}`}>Create:</span>
                      {row2Buttons.map(renderButton)}
                    </div>
                    
                    
                    {/* Row 3: Status Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'}`}>Action:</span>
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

              {/* Match Score */}
              {analysis.length > 0 && analysis[0].match_score !== null && analysis[0].match_score !== undefined && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Match Score:{' '}
                  </span>
                  <span 
                    className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                    onClick={async () => {
                      if (!company) return;
                      try {
                        const currentUser = await getCurrentUser();
                        if (!currentUser) return;

                        const { data: investorData, error: investorError } = await supabase
                          .from('investor_details')
                          .select('*')
                          .eq('user_id', currentUser.id)
                          .maybeSingle();

                        if (investorError || !investorData) {
                          alert('Unable to load investor preferences.');
                          return;
                        }

                        const matchResult = calculateMatchScore(company as CompanyRecord, investorData as InvestorDetailRecord);
                        setMatchDetails({
                          score: matchResult.score,
                          summary: matchResult.summary
                        });
                        setShowMatchModal(true);
                      } catch (error) {
                        console.error('Error loading match details:', error);
                        alert('Unable to load match details.');
                      }
                    }}
                  >
                    {typeof analysis[0].match_score === 'number' 
                      ? analysis[0].match_score.toFixed(1)
                      : typeof analysis[0].match_score === 'string' && !Number.isNaN(parseFloat(analysis[0].match_score))
                        ? parseFloat(analysis[0].match_score).toFixed(1)
                        : 'N/A'}
                  </span>
                  <span className={`text-xs ml-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    (click for details)
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

        {/* Analysis Results Section - Hidden */}
        {false && analysis.length > 0 && (analysis[0].status === 'Screened' || analysis[0].status === 'Analyzed' || analysis[0].status === 'In-Diligence') && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-blue-600 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analysis Results
              </h2>
            </div>
            <div className="p-6">
              {/* Scorecards Grid - Temporarily hidden */}
              {/* TODO: Re-enable scorecard display later */}
              {false && (
                <div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                    Analysis Scorecards
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Scorecard */}
                    {(() => {
                      const scoreData = getScoreCardData('product-analysis');
                      if (!scoreData) return null;
                      return (
                        <div className={`rounded-xl p-5 shadow-md transition-all duration-200 hover:shadow-lg ${
                          isDark 
                            ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50' 
                            : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {scoreData.title.split(' ')[0]}
                            </h4>
                            <div className={`text-2xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                              {scoreData.overallScore}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {scoreData.categories.map((category, index) => (
                              <div key={index} className={`flex justify-between items-center py-2 border-b ${
                                isDark ? 'border-blue-700/30' : 'border-blue-200/50'
                              } last:border-0`}>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {category.name}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                  {category.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Market Scorecard */}
                    {(() => {
                      const scoreData = getScoreCardData('market-analysis');
                      if (!scoreData) return null;
                      return (
                        <div className={`rounded-xl p-5 shadow-md transition-all duration-200 hover:shadow-lg ${
                          isDark 
                            ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50' 
                            : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {scoreData.title.split(' ')[0]}
                            </h4>
                            <div className={`text-2xl font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                              {scoreData.overallScore}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {scoreData.categories.map((category, index) => (
                              <div key={index} className={`flex justify-between items-center py-2 border-b ${
                                isDark ? 'border-green-700/30' : 'border-green-200/50'
                              } last:border-0`}>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {category.name}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                                  {category.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Team Scorecard */}
                    {(() => {
                      const scoreData = getScoreCardData('team-analysis');
                      if (!scoreData) return null;
                      return (
                        <div className={`rounded-xl p-5 shadow-md transition-all duration-200 hover:shadow-lg ${
                          isDark 
                            ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50' 
                            : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {scoreData.title.split(' ')[0]}
                            </h4>
                            <div className={`text-2xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                              {scoreData.overallScore}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {scoreData.categories.map((category, index) => (
                              <div key={index} className={`flex justify-between items-center py-2 border-b ${
                                isDark ? 'border-purple-700/30' : 'border-purple-200/50'
                              } last:border-0`}>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {category.name}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                                  {category.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Financials Scorecard */}
                    {(() => {
                      const scoreData = getScoreCardData('financial-analysis');
                      if (!scoreData) return null;
                      return (
                        <div className={`rounded-xl p-5 shadow-md transition-all duration-200 hover:shadow-lg ${
                          isDark 
                            ? 'bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50' 
                            : 'bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {scoreData.title.split(' ')[0]}
                            </h4>
                            <div className={`text-2xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                              {scoreData.overallScore}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {scoreData.categories.map((category, index) => (
                              <div key={index} className={`flex justify-between items-center py-2 border-b ${
                                isDark ? 'border-orange-700/30' : 'border-orange-200/50'
                              } last:border-0`}>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {category.name}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                                  {category.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Valuation Scorecard */}
                    {(() => {
                      const scoreData = getScoreCardData('valuation-analysis');
                      if (!scoreData) return null;
                      return (
                        <div className={`rounded-xl p-5 shadow-md transition-all duration-200 hover:shadow-lg ${
                          isDark 
                            ? 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 border border-indigo-700/50' 
                            : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {scoreData.title.split(' ')[0]}
                            </h4>
                            <div className={`text-2xl font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                              {scoreData.overallScore}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {scoreData.categories.map((category, index) => (
                              <div key={index} className={`flex justify-between items-center py-2 border-b ${
                                isDark ? 'border-indigo-700/30' : 'border-indigo-200/50'
                              } last:border-0`}>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {category.name}
                                </span>
                                <span className={`text-sm font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                  {category.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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

        {/* Analysis Reports Section - Split into Component and Comprehensive Reports */}
        {analysisReports.length > 0 && (() => {
          // Helper function to get report title for sorting
          const getReportTitle = (reportType: string): string => {
            return (reportType || 'Report').replace(/-/g, ' ').toLowerCase();
          };

          // Helper function to sort reports by title, then by date (descending)
          const sortReports = (reports: typeof analysisReports) => {
            return [...reports].sort((a, b) => {
              const titleA = getReportTitle(a.report_type);
              const titleB = getReportTitle(b.report_type);
              
              // First sort by title
              if (titleA !== titleB) {
                return titleA.localeCompare(titleB);
              }
              
              // If titles are equal, sort by date descending
              return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
            });
          };

          // Component Reports: Product, Market, Team, Financials
          const componentReportTypes = ['product-analysis', 'market-analysis', 'team-analysis', 'financial-analysis'];
          const componentReports = sortReports(
            analysisReports.filter(report => 
              componentReportTypes.includes((report.report_type || '').toLowerCase())
            )
          );

          // Comprehensive Reports: Score Card, Detailed Report, Diligence Questions, Valuation Report, Founder Report
          const comprehensiveReportTypes = ['scorecard', 'detail-report', 'diligence-questions', 'valuation-analysis', 'founder-report'];
          const comprehensiveReports = sortReports(
            analysisReports.filter(report => 
              comprehensiveReportTypes.includes((report.report_type || '').toLowerCase())
            )
          );

          // Helper function to render a report card
          const renderReportCard = (report: typeof analysisReports[0]) => {
            const isScorecard = (report.report_type || '').toLowerCase().includes('scorecard');
            const isFounderReport = (report.report_type || '').toLowerCase().includes('founder-report');
            return (
              <div
                key={report.id}
                className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className={`font-semibold capitalize mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {(report.report_type || 'Report').replace(/-/g, ' ')}
                      </h4>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-1`}>
                        {report.file_name}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Generated: {new Date(report.generated_at).toLocaleDateString()}{' '}
                        {new Date(report.generated_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isFounderReport && (
                        <button
                          onClick={async () => {
                            try {
                              if (!report.file_path) {
                                alert('Report file not found');
                                return;
                              }

                              // Get session for authentication
                              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                              if (sessionError || !session?.access_token) {
                                alert('Authentication required. Please log in again.');
                                return;
                              }

                              // Get signed URL for the PDF
                              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
                              const downloadUrlFunction = `${supabaseUrl}/functions/v1/get-report-download-url`;
                              
                              const urlResponse = await fetch(downloadUrlFunction, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  file_path: report.file_path,
                                  expires_in: 3600 // 1 hour
                                })
                              });

                              if (!urlResponse.ok) {
                                const errorText = await urlResponse.text();
                                console.error('Failed to get report URL:', errorText);
                                alert('Unable to generate report URL');
                                return;
                              }

                              const { signed_url } = await urlResponse.json();
                              if (!signed_url) {
                                alert('Unable to generate report URL');
                                return;
                              }

                              // Call email function
                              const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
                              
                              const emailResponse = await fetch(functionUrl, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  toEmail: 'vkotrappa@gmail.com',
                                  toName: 'Founder',
                                  subject: 'PitchFork: Founder Report',
                                  body: 'Thank you for your submission to PitchFork. Here is your feedback.\n\n--- PitchFork',
                                  senderName: 'PitchFork',
                                  companyName: company?.name || 'PitchFork',
                                  messageType: 'founder',
                                  pdfUrl: signed_url,
                                  pdfFileName: report.file_name || 'founder-report.pdf'
                                })
                              });

                              if (!emailResponse.ok) {
                                const errorText = await emailResponse.text();
                                console.error('Failed to send email:', errorText);
                                alert('Failed to send email. Please try again.');
                                return;
                              }

                              setMessageStatus({ type: 'success', text: 'Founder report sent by email successfully!' });
                              setTimeout(() => setMessageStatus(null), 3000);
                            } catch (error) {
                              console.error('Error sending founder report email:', error);
                              alert('Failed to send email. Please try again.');
                            }
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded transition-colors flex-shrink-0"
                          title="Send Founder Report by Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!report.file_path) {
                            alert('Report file not found');
                            return;
                          }
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              alert('Authentication required. Please log in again.');
                              return;
                            }

                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
                            const functionUrl = `${supabaseUrl}/functions/v1/get-report-download-url`;

                            const response = await fetch(functionUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                              body: JSON.stringify({
                                file_path: report.file_path,
                                expires_in: 3600 // 1 hour
                              })
                            });

                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error('Failed to get report URL:', errorText);
                              alert('Failed to access report. Please try again.');
                              return;
                            }

                            const { signed_url } = await response.json();
                            if (signed_url) {
                              setPdfUrl(signed_url);
                              setPdfFileName(report.file_name);
                              setShowPdfModal(true);
                            } else {
                              alert('Unable to generate report URL');
                            }
                          } catch (error) {
                            console.error('Error accessing report:', error);
                            alert('Failed to access report. Please try again.');
                          }
                        }}
                        className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors flex-shrink-0"
                        title="View PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!report.file_path) {
                            alert('Report file not found');
                            return;
                          }
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) {
                              alert('Authentication required. Please log in again.');
                              return;
                            }

                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
                            const functionUrl = `${supabaseUrl}/functions/v1/get-report-download-url`;

                            const response = await fetch(functionUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                              body: JSON.stringify({
                                file_path: report.file_path,
                                expires_in: 3600 // 1 hour
                              })
                            });

                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error('Failed to get report URL:', errorText);
                              alert('Failed to download report. Please try again.');
                              return;
                            }

                            const { signed_url } = await response.json();
                            if (signed_url) {
                              window.open(signed_url, '_blank');
                            } else {
                              alert('Unable to generate report URL');
                            }
                          } catch (error) {
                            console.error('Error downloading report:', error);
                            alert('Failed to download report. Please try again.');
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors flex-shrink-0"
                        title="Download report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this report?')) return;
                          try {
                            const { error } = await supabase
                              .from('analysis_reports')
                              .delete()
                              .eq('id', report.id);
                            if (error) throw error;
                            await loadAnalysisReports(id!);
                          } catch (error) {
                            console.error('Error deleting report:', error);
                            alert('Failed to delete report');
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isScorecard && (
                    <p className={`text-xs italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      View detailed results in the Scorecard Highlights section above.
                    </p>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-8 mb-8">
              {/* Component Reports Section */}
              {componentReports.length > 0 && (
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-blue-600 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Component Reports
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {componentReports.map(renderReportCard)}
                    </div>
                  </div>
                </div>
              )}

              {/* Comprehensive Reports Section */}
              {comprehensiveReports.length > 0 && (
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-blue-600 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Comprehensive Reports
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {comprehensiveReports.map(renderReportCard)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-blue-600 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Company Information
            </h2>
            <button
              onClick={() => navigate('/edit-company', { state: { company } })}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-navy-700 text-silver-300 hover:bg-navy-600' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title="Edit Company Information"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </button>
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

      {/* PDF Viewer Modal */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div 
            className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl overflow-hidden flex flex-col`}
            style={{ 
              width: modalSize.width > 0 ? `${modalSize.width}px` : '95vw',
              height: modalSize.height > 0 ? `${modalSize.height}px` : '92vh',
              minWidth: '800px',
              minHeight: '600px',
              maxWidth: '98vw',
              maxHeight: '98vh'
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {pdfFileName}
              </h2>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfUrl(null);
                  setPdfFileName('');
                }}
                className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden relative">
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
              {/* Resize Handle */}
              <div 
                className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize select-none"
                style={{
                  background: 'linear-gradient(-135deg, transparent 35%, #666 35%, #666 45%, transparent 45%, transparent 55%, #666 55%, #666 65%, transparent 65%)',
                  opacity: '0.5',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const modalDiv = e.currentTarget.closest('div[class*="bg-gray"]');
                  if (modalDiv) {
                    const rect = modalDiv.getBoundingClientRect();
                    setResizeStart({
                      x: e.clientX,
                      y: e.clientY,
                      width: rect.width,
                      height: rect.height
                    });
                  }
                  setIsResizing(true);
                }}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Match Details Modal */}
      {showMatchModal && matchDetails && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMatchModal(false)}
          />
          <div className={`relative ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-inherit">
              <h2 className="text-2xl font-bold text-blue-600">
                Match Score Details: {company.name}
              </h2>
              <button
                onClick={() => setShowMatchModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{company.name}</h3>
                    {company.industry && (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {company.industry}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-1">
                      Match Score
                    </div>
                    <div className="text-4xl font-bold text-green-500">
                      {matchDetails.score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  How the Match Was Calculated
                </h4>
                <div className="space-y-3">
                  {matchDetails.summary.map((detail, index) => {
                    const isMismatch = detail.toLowerCase().includes('no overlap') ||
                      detail.toLowerCase().includes('did not provide') ||
                      detail.toLowerCase().includes('below target') ||
                      detail.toLowerCase().includes('not provided') ||
                      detail.toLowerCase().includes('outside preferred') ||
                      detail.toLowerCase().includes('no match');
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg ${
                          isDark ? 'bg-gray-700' : 'bg-gray-50'
                        }`}
                      >
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          isMismatch ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <span className={`text-sm ${
                          isMismatch 
                            ? isDark ? 'text-red-400' : 'text-red-600'
                            : isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {detail}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-inherit">
              <button
                onClick={() => setShowMatchModal(false)}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isDark 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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