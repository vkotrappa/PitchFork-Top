import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Calendar, FileText, User, ChevronDown, Upload, BarChart3, Trash2, Eye, MessageCircle, Users, CreditCard as Edit3 } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface FounderDashboardProps {
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
  funding_stage?: string;
  date_submitted: string;
  created_at: string;
  revenue?: string;
  valuation?: string;
  url?: string;
}

interface Document {
  id: string;
  company_id: string;
  filename: string;
  document_name: string;
  description: string;
  path: string;
  date_added: string;
}

interface InvestorAnalysis {
  id: string;
  investor_user_id: string;
  status: string;
  recommendation?: string;
  history?: string;
  updated_at: string;
  investor_details: {
    name: string;
    email: string;
    firm_name?: string;
  };
}

const FounderDashboard: React.FC<FounderDashboardProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [investorAnalyses, setInvestorAnalyses] = useState<InvestorAnalysis[]>([]);
  const [messageTexts, setMessageTexts] = useState<Record<string, string>>({});
  const [sendingMessage, setSendingMessage] = useState<Record<string, boolean>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication and load data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      await loadFounderCompany();
    };
    
    checkAuthAndLoadData();
  }, [navigate]);

  const loadFounderCompany = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.log('FounderDashboard: No current user');
        return;
      }

      console.log('FounderDashboard: Loading company for user:', currentUser.id, currentUser.email);

      // Look for companies where the founder is the owner (user_id)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      console.log('FounderDashboard: Company query result:', {
        found: !!companyData,
        error: companyError,
        companyId: companyData?.id,
        companyName: companyData?.name,
        userId: companyData?.user_id
      });

      if (companyError) {
        console.error('Error loading company:', companyError);
        setIsLoading(false);
        return;
      }

      if (companyData) {
        console.log('FounderDashboard: Company found:', companyData.name);
        setCompany(companyData);
        sessionStorage.setItem('companyId', companyData.id);
        await loadDocuments(companyData.id);
        await loadInvestorAnalyses(companyData.id);
      } else {
        console.log('FounderDashboard: No company found for this user');
      }
    } catch (error) {
      console.error('Error loading founder data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvestorAnalyses = async (companyId: string) => {
    try {
      console.log('FounderDashboard: Loading investor analyses for company:', companyId);
      
      // First, get analysis records
      const { data: analysisData, error: analysisError } = await supabase
        .from('analysis')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      console.log('FounderDashboard: Analysis records:', {
        count: analysisData?.length || 0,
        error: analysisError,
        data: analysisData
      });

      if (analysisError) {
        console.error('Error loading investor analyses:', analysisError);
        return;
      }

      if (!analysisData || analysisData.length === 0) {
        console.log('FounderDashboard: No analysis records found');
        setInvestorAnalyses([]);
        return;
      }

      // Get unique investor user IDs
      const investorUserIds = [...new Set(analysisData.map(a => a.investor_user_id))];
      console.log('FounderDashboard: Loading details for investors:', investorUserIds);

      // Fetch investor details for all investors
      const { data: investorDetailsData, error: investorError } = await supabase
        .from('investor_details')
        .select('user_id, name, email, firm_name')
        .in('user_id', investorUserIds);

      console.log('FounderDashboard: Investor details:', {
        count: investorDetailsData?.length || 0,
        error: investorError,
        data: investorDetailsData
      });

      if (investorError) {
        console.error('Error loading investor details:', investorError);
      }

      // Merge investor details into analysis records
      const investorDetailsMap = new Map(
        (investorDetailsData || []).map(inv => [inv.user_id, inv])
      );

      const analysesWithInvestorDetails = analysisData.map(analysis => ({
        ...analysis,
        investor_details: investorDetailsMap.get(analysis.investor_user_id) || {
          name: 'Unknown Investor',
          email: '',
          firm_name: null
        }
      }));

      console.log('FounderDashboard: Final analyses with details:', analysesWithInvestorDetails);

      setInvestorAnalyses(analysesWithInvestorDetails);
    } catch (error) {
      console.error('Error loading investor analyses:', error);
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


  const handleSendMessage = async (investorUserId: string, investorName: string) => {
    const messageText = messageTexts[investorUserId];
    if (!messageText?.trim() || !company) return;

    try {
      setSendingMessage(prev => ({ ...prev, [investorUserId]: true }));

      const { error } = await supabase
        .from('messages')
        .insert({
          company_id: company.id,
          sender_type: 'founder',
          sender_id: user?.id,
          recipient_type: 'investor',
          recipient_id: investorUserId,
          message_title: `Message from ${company.name}`,
          message_detail: messageText,
          message_status: 'unread'
        });

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
        return;
      }

      // Clear the message text
      setMessageTexts(prev => ({ ...prev, [investorUserId]: '' }));
      alert(`Message sent to ${investorName}!`);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(prev => ({ ...prev, [investorUserId]: false }));
    }
  };

  const handleOpenInvestorMatch = () => {
    if (!company) {
      return;
    }
    const url = `/company-investor-match?companyId=${encodeURIComponent(company.id)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen font-arial transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no company is found, show the submit pitch deck option
  if (!company) {
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
                
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Click outside handler for dropdown */}
          {showUserMenu && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowUserMenu(false)}
            />
          )}
        </nav>

        {/* Main Content - No Company Submitted */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-12`}>
              <Building2 className="w-16 h-16 mx-auto mb-6 text-orange-500" />
              <h1 className="text-3xl font-bold text-orange-600 mb-4">Create Your Company Profile</h1>
              <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
                Welcome to Pitch Fork! To get started, create your company profile so we can match you with the right investors.
              </p>
              <Link 
                to="/submit-pitch-deck"
                className="bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors inline-flex items-center"
              >
                <Upload className="w-6 h-6 mr-3" />
                Founders: Create Company Profile
              </Link>
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
                    <button 
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Click outside handler for dropdown */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          />
        )}
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-orange-600 mb-2">Founder Dashboard</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}! Track your submission status and manage your company information.
          </p>
        </div>

        {/* Company Information - Now at Top */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-orange-600">{company.name}</h2>
            <button 
              onClick={() => navigate('/edit-company', { state: { company } })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Company
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {company.industry && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Industry</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.industry}</p>
                </div>
              )}
              {company.funding_stage && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Funding Stage</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.funding_stage}</p>
                </div>
              )}
              {company.revenue && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Revenue</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.revenue}</p>
                </div>
              )}
              {company.valuation && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Valuation</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.valuation}</p>
                </div>
              )}
              {company.contact_name && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Contact</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.contact_name}</p>
                </div>
              )}
              {company.email && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.email}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.phone}</p>
                </div>
              )}
              {company.url && (
                <div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Website</span>
                  <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <a href={company.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {company.url}
                    </a>
                  </p>
                </div>
              )}
              <div>
                <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date Submitted</span>
                <p className={`mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(company.date_submitted).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            {company.description && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {company.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Investor Submissions Section */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-blue-600 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Investor Submissions ({investorAnalyses.length})
            </h2>
          </div>
          <div className="p-6">
            {investorAnalyses.length === 0 ? (
              <div className="text-center py-8">
                <Users className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No investor submissions yet</div>
              </div>
            ) : (
              <div className="space-y-6">
                {investorAnalyses.map((analysis) => (
                  <div key={analysis.id} className={`p-6 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    {/* Investor Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {analysis.investor_details.name}
                        </h3>
                        {analysis.investor_details.firm_name && (
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {analysis.investor_details.firm_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        analysis.status === 'Screened' ? 'bg-blue-100 text-blue-800' :
                        analysis.status === 'Analyzed' ? 'bg-green-100 text-green-800' :
                        analysis.status === 'submitted' ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {analysis.status}
                      </span>
                    </div>

                    {/* History Timeline */}
                    {analysis.history && (
                      <div className="mb-4">
                        <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>History:</h4>
                        <div className="space-y-1">
                          {analysis.history.split('\n').map((entry, index) => (
                            <div key={index} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center`}>
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              {entry}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Send Message */}
                    <div className={`pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Send Message</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={messageTexts[analysis.investor_user_id] || ''}
                          onChange={(e) => setMessageTexts(prev => ({ ...prev, [analysis.investor_user_id]: e.target.value }))}
                          placeholder="Type your message..."
                          className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                        <button
                          onClick={() => handleSendMessage(analysis.investor_user_id, analysis.investor_details.name)}
                          disabled={!messageTexts[analysis.investor_user_id]?.trim() || sendingMessage[analysis.investor_user_id]}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingMessage[analysis.investor_user_id] ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Match Investors Call-to-Action */}
        <div className="mt-10 text-center">
          <button
            onClick={handleOpenInvestorMatch}
            className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Match Investors
          </button>
          <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            See how well investors align with your company profile based on sector, ARR, valuation, and more.
          </p>
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

export default FounderDashboard;