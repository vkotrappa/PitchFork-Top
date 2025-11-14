import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock, CheckCircle, XCircle, Filter, Calendar, Building2, ChevronDown, User, X } from 'lucide-react';
import { signOut, getCurrentUser, supabase } from '../lib/supabase';
import { analyzeCompany, generateReportPDFs, saveAnalysisReports } from '../lib/analysisService';
import { calculateMatchScore, CompanyRecord, InvestorDetailRecord } from './InvestorCompanyMatch';

interface DashboardProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  date_submitted: string;
  created_at: string;
  overall_score?: number;
  valuation_value?: number;
  valuation_units?: string;
  analysis?: Analysis[]; // Status and recommendation come from here
}

interface Analysis {
  id: string;
  investor_user_id: string;
  status: string;
  overall_score?: number;
  recommendation?: string;
  recommendation_reason?: string;
  match_score?: number | string | null;
  comments?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState({
    submitted: true,
    inProgress: true,
    screened: true,
    analyzed: true,
    inDiligence: true,
    rejected: true,
    failed: true
  });
  
  const [itemsToShow, setItemsToShow] = React.useState('10');
  const [sortBy, setSortBy] = React.useState('Recent');
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [analyzingCompanies, setAnalyzingCompanies] = React.useState<Set<string>>(new Set());
  const [showMatchModal, setShowMatchModal] = React.useState(false);
  const [selectedMatchDetails, setSelectedMatchDetails] = React.useState<{ company: Company; score: number; summary: string[] } | null>(null);

  // Check authentication on component mount
  React.useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      
      // Check user type and redirect if founder
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', currentUser.id)
        .single();
      
      if (profile?.user_type === 'founder') {
        navigate('/founder-dashboard');
        return;
      }
      
      await loadCompanies();
    };
    
    checkAuth();
  }, [navigate]);

  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.log('Dashboard: No current user found');
        return;
      }

      console.log('Dashboard: Loading companies for user:', currentUser.id, currentUser.email);

      // Load only companies assigned to this investor (have entry in analysis table)
      // Note: We don't join investor_details because there's no direct FK relationship
      // between analysis and investor_details (they both link to auth.users)
      const { data: analysisData, error: analysisError } = await supabase
        .from('analysis')
        .select(`
          *,
          companies:company_id(*)
        `)
        .eq('investor_user_id', currentUser.id);
      
      console.log('Dashboard: Raw analysis data:', analysisData);

      console.log('Dashboard: Analysis query result:', { 
        dataCount: analysisData?.length || 0, 
        error: analysisError,
        sampleData: analysisData?.[0]
      });

      if (analysisError) {
        console.error('Error loading analysis:', analysisError);
        alert(`Error loading companies: ${analysisError.message}`);
        return;
      }

      if (!analysisData || analysisData.length === 0) {
        console.log('Dashboard: No analysis records found for this investor');
        setCompanies([]);
        return;
      }

      // Transform data: extract companies and attach their analysis records
      const companiesMap = new Map<string, Company>();
      
      (analysisData || []).forEach(analysis => {
        console.log('Dashboard: Processing analysis:', {
          analysisId: analysis.id,
          companyId: analysis.company_id,
          hasCompanyData: !!analysis.companies
        });

        const company = analysis.companies;
        if (company) {
          if (!companiesMap.has(company.id)) {
            companiesMap.set(company.id, {
              ...company,
              analysis: []
            });
          }
          companiesMap.get(company.id)!.analysis!.push({
            id: analysis.id,
            investor_user_id: analysis.investor_user_id,
            status: analysis.status,
            overall_score: analysis.overall_score,
            recommendation: analysis.recommendation,
            recommendation_reason: analysis.recommendation_reason,
            match_score: analysis.match_score ?? null,
            comments: analysis.comments
          });
        } else {
          console.warn('Dashboard: Analysis has no company data:', analysis.id);
        }
      });

      // Convert map to array and sort by date_submitted
      const companiesWithAnalysis = Array.from(companiesMap.values()).sort((a, b) => {
        return new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime();
      });

      console.log('Dashboard: Final companies list:', {
        count: companiesWithAnalysis.length,
        companies: companiesWithAnalysis.map(c => ({ id: c.id, name: c.name, analysisStatus: c.analysis?.[0]?.status }))
      });

      setCompanies(companiesWithAnalysis);
    } catch (error) {
      console.error('Error loading companies:', error);
      alert(`Error loading companies: ${error}`);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleAnalyze = async (companyId: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (analyzingCompanies.has(companyId)) {
      return; // Already analyzing
    }

    try {
      // Add to analyzing set
      setAnalyzingCompanies(prev => new Set(prev).add(companyId));

      // Step 1: Analyze the company
      const analysisResult = await analyzeCompany(companyId);

      // Step 2: Update company with score and recommendation
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          overall_score: analysisResult.overall_score,
          recommendation: analysisResult.recommendation,
          status: 'Analyzed'
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating company:', updateError);
        throw new Error('Failed to update company analysis');
      }

      // Step 3: Generate PDF reports
      const reports = await generateReportPDFs(companyId, analysisResult, companyName);

      // Step 4: Save reports to storage and database
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await saveAnalysisReports(companyId, companyName, reports, currentUser.id);
      }

      // Step 5: Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { 
              ...company, 
              overall_score: analysisResult.overall_score,
              recommendation: analysisResult.recommendation,
              status: 'Analyzed'
            }
          : company
      ));

      // Step 6: Create notification message for founder
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          company_id: companyId,
          sender_type: 'system',
          sender_id: null,
          recipient_type: 'founder',
          recipient_id: null,
          message_title: 'Analysis Complete',
          message_detail: `Your company analysis is complete. Overall score: ${analysisResult.overall_score}/10. Recommendation: ${analysisResult.recommendation}`,
          message_status: 'unread'
        });

      if (messageError) {
        console.error('Error creating analysis notification:', messageError);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      // Remove from analyzing set
      setAnalyzingCompanies(prev => {
        const newSet = new Set(prev);
        newSet.delete(companyId);
        return newSet;
      });
    }
  };

  const handleCardClick = (companyId: string) => {
    navigate(`/venture/${companyId}`);
  };

  const handleShowMatchDetails = async (company: Company, matchScore: number) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Load investor details
      const { data: investorData, error: investorError } = await supabase
        .from('investor_details')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (investorError || !investorData) {
        alert('Unable to load investor preferences.');
        return;
      }

      // Calculate match details
      const matchResult = calculateMatchScore(company as CompanyRecord, investorData as InvestorDetailRecord);
      
      setSelectedMatchDetails({
        company,
        score: matchResult.score,
        summary: matchResult.summary
      });
      setShowMatchModal(true);
    } catch (error) {
      console.error('Error loading match details:', error);
      alert('Unable to load match details.');
    }
  };

  const handleFilterChange = (filterName: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  // Filter companies based on selected filters
  // Status comes from analysis table (first analysis record for this investor)
  const filteredCompanies = companies.filter(company => {
    const analysisStatus = company.analysis?.[0]?.status?.toLowerCase().replace('-', '').replace(' ', '') || 'submitted';
    const originalStatus = company.analysis?.[0]?.status?.toLowerCase() || '';
    
    // Check if status indicates failure (Rejected, Failed, or contains "fail")
    const isFailed = originalStatus && (
      originalStatus === 'rejected' ||
      originalStatus === 'failed' ||
      originalStatus.includes('fail')
    );
    
    // If failed filter is unchecked and this is a failed status, exclude it
    if (isFailed && !filters.failed) return false;
    
    // If it's a failed status and failed filter is checked, include it
    if (isFailed && filters.failed) return true;
    
    // Apply other status filters (only if not a failed status)
    if (analysisStatus === 'submitted' && filters.submitted) return true;
    if (analysisStatus === 'inprogress' && filters.inProgress) return true;
    if (analysisStatus === 'screened' && filters.screened) return true;
    if (analysisStatus === 'analyzed' && filters.analyzed) return true;
    if (analysisStatus === 'indiligence' && filters.inDiligence) return true;
    if (analysisStatus === 'rejected' && filters.rejected) return true;
    
    return false;
  });

  // Apply sorting and limit
  const sortedAndLimitedCompanies = React.useMemo(() => {
    let sorted = [...filteredCompanies];
    
    // Sort by date
    sorted.sort((a, b) => {
      const dateA = new Date(a.date_submitted).getTime();
      const dateB = new Date(b.date_submitted).getTime();
      return sortBy === 'Recent' ? dateB - dateA : dateA - dateB;
    });

    // Apply limit
    if (itemsToShow !== 'All') {
      sorted = sorted.slice(0, parseInt(itemsToShow));
    }

    return sorted;
  }, [filteredCompanies, sortBy, itemsToShow]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/');
    }
  };

  // Function to determine recommendation based on score
  const getRecommendation = (score: number | null) => {
    if (score === null) return null;
    if (score >= 8) return "Invest";
    if (score >= 5) return "Consider";
    return "Reject";
  };

  const stats = [
    { label: "Total Deals", value: companies.length.toString(), icon: <BarChart3 className="w-6 h-6" /> },
    { label: "Screened", value: companies.filter(c => c.analysis?.[0]?.status === 'Screened').length.toString(), icon: <CheckCircle className="w-6 h-6" /> },
    { label: "Analyzed", value: companies.filter(c => c.analysis?.[0]?.status === 'Analyzed').length.toString(), icon: <BarChart3 className="w-6 h-6" /> },
    { label: "Diligence", value: companies.filter(c => c.analysis?.[0]?.status === 'In-Diligence').length.toString(), icon: <Users className="w-6 h-6" /> },
    { label: "Rejected", value: companies.filter(c => c.analysis?.[0]?.status === 'Rejected').length.toString(), icon: <XCircle className="w-6 h-6" /> }
  ];

  return (
    <>
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
                <Link to="/dashboard" className="text-gold-600 font-bold">Dashboard</Link>
                
                {/* Preferences Dropdown - Only show for investors */}
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
              
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Link 
                  to="/" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors font-semibold`}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Home
                </Link>
              </div>
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

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-4">Investment Dashboard</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-navy-600'}`}>
            Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}! Here's your investment portfolio overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} p-8 rounded-xl shadow-financial border hover:shadow-gold transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>{stat.label}</p>
                  <p className="text-3xl font-bold text-gold-600">{stat.value}</p>
                </div>
                <div className="text-gold-500">
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section 1: Filters */}
        <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border mb-12`}>
          <div className="p-6 border-b border-silver-200 dark:border-navy-700">
            <h2 className="text-2xl font-bold text-gold-600 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Filters - Compact Layout */}
              <div>
                <h3 className="text-sm font-bold mb-3 text-navy-800 dark:text-silver-200">Status</h3>
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'submitted', label: 'Submitted' },
                    { key: 'inProgress', label: 'In-Progress' },
                    { key: 'screened', label: 'Screened' },
                    { key: 'analyzed', label: 'Analyzed' },
                    { key: 'inDiligence', label: 'In-Diligence' },
                    { key: 'rejected', label: 'Rejected' },
                    { key: 'failed', label: 'Failed' }
                  ].map((filter) => (
                    <label key={filter.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters[filter.key as keyof typeof filters]}
                        onChange={() => handleFilterChange(filter.key as keyof typeof filters)}
                        className="rounded border-silver-300 text-gold-600 focus:ring-gold-500"
                      />
                      <span className={`ml-2 text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'}`}>
                        {filter.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Items to Show */}
              <div>
                <h3 className="text-sm font-bold mb-3 text-navy-800 dark:text-silver-200">Items to Show</h3>
                <select
                  value={itemsToShow}
                  onChange={(e) => setItemsToShow(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-semibold ${
                    isDark 
                      ? 'bg-navy-700 border-navy-600 text-white' 
                      : 'bg-white border-silver-300 text-navy-900'
                  }`}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="All">All</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="text-sm font-bold mb-3 text-navy-800 dark:text-silver-200">Sort By Date</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-semibold ${
                    isDark 
                      ? 'bg-navy-700 border-navy-600 text-white' 
                      : 'bg-white border-silver-300 text-navy-900'
                  }`}
                >
                  <option value="Recent">Recent</option>
                  <option value="Oldest">Oldest</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Venture Cards */}
        <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} rounded-xl shadow-financial border`}>
          <div className="p-6 border-b border-silver-200 dark:border-navy-700">
            <h2 className="text-2xl font-bold text-gold-600">Recent Ventures</h2>
          </div>
          <div className="p-6">
            {isLoadingCompanies ? (
              <div className="text-center py-8">
                <div className="text-silver-500">Loading companies...</div>
              </div>
            ) : sortedAndLimitedCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-navy-600' : 'text-silver-400'}`} />
                <div className={`${isDark ? 'text-silver-400' : 'text-navy-500'}`}>No companies match the selected filters</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedAndLimitedCompanies.map((company) => {
                  // Get status and recommendation from analysis table
                  const analysis = company.analysis?.[0];
                  const status = analysis?.status || 'Submitted';
                  const recommendation = analysis?.recommendation || getRecommendation(company.overall_score ?? null);
                  const matchScoreRaw = analysis?.match_score;
                  const matchScore =
                    typeof matchScoreRaw === 'number'
                      ? matchScoreRaw
                      : typeof matchScoreRaw === 'string' && !Number.isNaN(parseFloat(matchScoreRaw))
                        ? parseFloat(matchScoreRaw)
                        : null;
                  const isAnalyzing = analyzingCompanies.has(company.id);
                return (
                    <div 
                      key={company.id} 
                    className={`p-6 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-gold hover:scale-105 ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 hover:bg-navy-650' 
                        : 'bg-silver-50 border-silver-200 hover:bg-white hover:shadow-financial'
                    }`}
                      onClick={() => handleCardClick(company.id)}
                  >
                    {/* Venture Name */}
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gold-600">{company.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === 'submitted' || status === 'Submitted' ? 'bg-silver-100 text-silver-800' :
                          status === 'Screened' ? 'bg-blue-100 text-blue-800' :
                          status === 'Pending' ? 'bg-gold-100 text-gold-800' :
                          status === 'Analyzed' ? 'bg-navy-100 text-navy-800' :
                          status === 'Invested' ? 'bg-success-100 text-success-800' :
                          status === 'In-Diligence' ? 'bg-gold-100 text-gold-800' :
                        'bg-danger-100 text-danger-800'
                      }`}>
                          {status === 'submitted' || status === 'Submitted' ? <Clock className="w-3 h-3 mr-1" /> :
                           status === 'Screened' ? <Filter className="w-3 h-3 mr-1" /> :
                           status === 'Pending' ? <Clock className="w-3 h-3 mr-1" /> :
                           status === 'Analyzed' ? <BarChart3 className="w-3 h-3 mr-1" /> :
                           status === 'Invested' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                           status === 'In-Diligence' ? <Users className="w-3 h-3 mr-1" /> :
                         <XCircle className="w-3 h-3 mr-1" />}
                          {status}
                      </span>
                    </div>

                    {/* Industry */}
                    <div className="flex items-center mb-2">
                      <Building2 className="w-4 h-4 mr-2 text-gold-500" />
                      <span className={`text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-600'}`}>
                          {company.industry || 'Not specified'}
                      </span>
                    </div>

                    {/* Date Submitted */}
                    <div className="flex items-center mb-3">
                      <Calendar className="w-4 h-4 mr-2 text-gold-500" />
                      <span className={`text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-600'}`}>
                          Submitted: {new Date(company.date_submitted).toLocaleDateString()}
                      </span>
                    </div>


                    {/* Recommendation */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-semibold ${isDark ? 'text-silver-400' : 'text-navy-500'}`}>Recommendation</p>
                        {matchScore !== null && !Number.isNaN(matchScore) && (
                          <span 
                            className="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowMatchDetails(company, matchScore);
                            }}
                          >
                            Match Score: {matchScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                        {recommendation && recommendation !== 'Pending Analysis' ? (
                        <>
                          <p className={`text-sm font-medium ${
                              recommendation === 'Invest' || recommendation === 'Analyze' ? 'text-success-600' :
                              recommendation === 'Consider' ? 'text-gold-600' :
                            'text-danger-600'
                          }`}>
                              {recommendation}
                          </p>
                          {analysis?.recommendation_reason && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
                              {analysis.recommendation_reason}
                            </p>
                          )}
                        </>
                      ) : (
                          <p className={`text-sm ${isDark ? 'text-silver-400' : 'text-navy-500'}`}>Pending Analysis</p>
                      )}
                    </div>

                    {/* Analyze Button for Submitted Status */}
                      {(status === 'submitted' || status === 'Submitted') && (
                      <div className="mt-4 pt-3 border-t border-silver-200 dark:border-navy-600">
                        <button
                            onClick={(e) => handleAnalyze(company.id, company.name, e)}
                            disabled={isAnalyzing}
                          className="w-full bg-gold-gradient text-white py-2 px-4 rounded-lg font-bold hover:shadow-gold focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-financial"
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Match Details Modal */}
      {showMatchModal && selectedMatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMatchModal(false)}
          />
          <div className={`relative ${isDark ? 'bg-navy-800' : 'bg-white'} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 p-6 border-b border-silver-200 dark:border-navy-700 flex items-center justify-between bg-inherit">
              <h2 className="text-2xl font-bold text-gold-600">
                Match Score Details: {selectedMatchDetails.company.name}
              </h2>
              <button
                onClick={() => setShowMatchModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'} transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{selectedMatchDetails.company.name}</h3>
                    {selectedMatchDetails.company.industry && (
                      <p className={`text-sm ${isDark ? 'text-silver-400' : 'text-navy-600'}`}>
                        {selectedMatchDetails.company.industry}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-1">
                      Match Score
                    </div>
                    <div className="text-4xl font-bold text-green-500">
                      {selectedMatchDetails.score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-silver-200' : 'text-navy-800'}`}>
                  How the Match Was Calculated
                </h4>
                <div className="space-y-3">
                  {selectedMatchDetails.summary.map((detail, index) => {
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
                          isDark ? 'bg-navy-700' : 'bg-gray-50'
                        }`}
                      >
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          isMismatch ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <span className={`text-sm ${
                          isMismatch 
                            ? isDark ? 'text-red-400' : 'text-red-600'
                            : isDark ? 'text-silver-300' : 'text-navy-700'
                        }`}>
                          {detail}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-6 border-t border-silver-200 dark:border-navy-700 flex justify-end bg-inherit">
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
    </>
  );
};

export default Dashboard;