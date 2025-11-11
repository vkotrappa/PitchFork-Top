import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronDown, BookOpen, HelpCircle, FileText, BarChart3, Settings, Target, Zap, CheckCircle, Mail } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface HelpProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Help: React.FC<HelpProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);

        // Check if user is a founder
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        setIsFounder(profile?.role === 'founder');
      }
      // No redirect - allow access without authentication
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
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
              {/* Navigation Menu - Only show if user is logged in */}
              {user && !isFounder && (
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
              )}

              {/* Founder Navigation - Only show if user is logged in */}
              {user && isFounder && (
                <nav className="hidden md:flex items-center space-x-6">
                  <Link to="/founder-dashboard" className={`${isDark ? 'text-silver-300 hover:text-white' : 'text-navy-700 hover:text-navy-900'} transition-colors font-semibold`}>Dashboard</Link>
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
              )}

              {/* Public Navigation - Show when user is not logged in */}
              {!user && (
                <nav className="hidden md:flex items-center space-x-6">
                  <Link to="/" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Home</Link>
                  <Link to="/help" className={`text-blue-600 font-medium transition-colors`}>Help</Link>
                  <Link to="/login" className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} px-4 py-2 rounded-lg transition-colors`}>
                    Login/Sign-Up
                  </Link>
                </nav>
              )}

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* Show appropriate back link based on user status */}
              {user && (
                <Link
                  to={isFounder ? "/founder-dashboard" : "/dashboard"}
                  className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              )}
              {!user && (
                <Link
                  to="/"
                  className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Home
                </Link>
              )}
            </div>
          </div>
        </div>

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

      {/* Help Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Help & Documentation</h1>
          <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Everything you need to know about using Pitch Fork
          </p>
        </div>

        {/* Overview */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
            What is PitchFork?
          </h2>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4 leading-relaxed font-semibold text-lg`}>
            PitchFork is an AI Driven VC-Investor Platform
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-bold text-lg mb-2 text-blue-600">For Founders:</h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                Provides a platform to submit your pitch deck and other information (financials, patent documents, market research, etc.) 
                for evaluation and consideration from selected investors – <strong>AND receive detailed feedback</strong> on your company and pitch.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2 text-blue-600">For Investors:</h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                Provides an AI-driven platform to receive, screen, analyze, evaluate, and diligence companies using comprehensive analysis 
                based on specific industry context, submitted documents, and public information including websites, publications, LinkedIn profiles, and more.
              </p>
            </div>
          </div>

          <div className={`${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-200'} rounded-lg p-4`}>
            <p className={`${isDark ? 'text-blue-300' : 'text-blue-900'} font-semibold`}>
              Key Benefit: Analyze companies in fields you're not an expert in with confidence, scale your deal flow, and never miss a hidden gem.
            </p>
          </div>
        </div>

        {/* For Investors */}
        {/* Show to everyone, not just authenticated investors */}
        <>
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Target className="w-6 h-6 mr-2 text-blue-600" />
                For Investors: How It Works
              </h2>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    1
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Set Your Investment Criteria</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Navigate to <strong>Preferences → Screening Criteria</strong> to set your specific screening criteria. 
                      Incoming proposals will be automatically screened based on your requirements including:
                    </p>
                    <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1`}>
                      <li>Revenue thresholds and financial requirements</li>
                      <li>Industry preferences and focus sectors</li>
                      <li>Geographic location requirements</li>
                      <li>Funding stage and company maturity</li>
                      <li>Team size and other custom criteria</li>
                    </ul>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    2
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Automated Screening & Review</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      From your <strong>Dashboard</strong>, you'll see all venture proposals with their analysis status. 
                      The platform automatically screens submissions based on your criteria, saving time by filtering non-matches:
                    </p>
                    <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1`}>
                      <li><strong>Open:</strong> New proposals awaiting initial screening</li>
                      <li><strong>Screened:</strong> Proposals that passed your criteria filter</li>
                      <li><strong>Analyzing:</strong> AI analysis in progress</li>
                      <li><strong>Reject:</strong> Proposals that don't meet your criteria or analysis</li>
                      <li><strong>Diligence:</strong> Promising ventures for deeper review</li>
                      <li><strong>Invest:</strong> Top candidates recommended for investment</li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    3
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Detailed AI-Driven Analysis with Custom Algorithms</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                      The AI analyzes companies using submitted documents, industry-specific context, and public information 
                      (websites, publications, LinkedIn, etc.). <strong className="text-blue-600 dark:text-blue-400">You can input your specific analysis algorithms 
                      to make output reports tailored to your exact requirements.</strong> Analysis is organized into four comprehensive categories:
                    </p>
                    
                    <div className="space-y-3 ml-4">
                      <div>
                        <h4 className="font-semibold text-blue-500 mb-1">A. Product/Service Analysis:</h4>
                        <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 text-sm space-y-0.5`}>
                          <li>Problem-Solution fit</li>
                          <li>Differentiation & Defensibility</li>
                          <li>Product–Market Readiness</li>
                          <li>Commercial Traction & Validation</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-blue-500 mb-1">B. Market Analysis:</h4>
                        <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 text-sm space-y-0.5`}>
                          <li>Serviceable Market Size & Growth</li>
                          <li>Competitive Landscape</li>
                          <li>Competitive Advantage & Positioning</li>
                          <li>Adoption Drivers & Risks</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-blue-500 mb-1">C. Leadership Team (Strengths and Gaps):</h4>
                        <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 text-sm space-y-0.5`}>
                          <li>Founder's experience</li>
                          <li>Go to Market leadership</li>
                          <li>Execution/Operations</li>
                          <li>Finance & Governance</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-blue-500 mb-1">D. Financials:</h4>
                        <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 text-sm space-y-0.5`}>
                          <li>Revenue & Growth</li>
                          <li>Financial Health & Burn</li>
                          <li>Capital Raised & Structure</li>
                          <li>Valuation & Benchmarking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    4
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Analysis & Report Generation</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                      On the Venture Detail page, you'll find organized action buttons:
                    </p>
                    <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-2 mb-3`}>
                      <li><strong>Analyze:</strong> Run individual analysis reports (Product, Market, Team, Financials). 
                      Button colors indicate status: <span className="font-semibold">Blue</span> (not started), 
                      <span className="font-semibold text-yellow-500"> Yellow</span> (in progress), 
                      <span className="font-semibold text-green-500"> Green</span> (completed)</li>
                      <li><strong>Create:</strong> Generate comprehensive reports after all 4 analyses are complete:
                        <ul className="ml-6 mt-1 space-y-1">
                          <li>Score Card - Overall evaluation scores across all categories</li>
                          <li>Detail Report - In-depth analysis document</li>
                          <li>Diligence Questions - AI-generated follow-up questions</li>
                          <li>Founder Report - Feedback to share with entrepreneurs</li>
                        </ul>
                      </li>
                      <li><strong>Action:</strong> Move companies to Diligence or Reject status</li>
                    </ul>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      All reports are generated as professional PDFs using high-quality HTML-to-PDF formatting with proper styling, tables, and formatting.
                      The system automatically polls for completion, so buttons update in real-time without manual refresh.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    5
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Real-Time Status Tracking</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      The platform provides real-time visual feedback:
                    </p>
                    <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1 mb-3`}>
                      <li><strong>Button Color States:</strong> 
                        <ul className="ml-6 mt-1 space-y-1">
                          <li><span className="font-semibold text-blue-500">Blue</span> - Report doesn't exist (ready to run)</li>
                          <li><span className="font-semibold text-yellow-500">Yellow</span> - Analysis/report generation in progress (with spinner icon)</li>
                          <li><span className="font-semibold text-green-500">Green</span> - Report completed and available</li>
                        </ul>
                      </li>
                      <li><strong>Automatic Updates:</strong> The system polls every 5 seconds for report completion, updating buttons and reports list automatically</li>
                      <li><strong>Spinner Icons:</strong> When buttons turn yellow, a spinning icon appears alongside the status text (Analyzing..., Creating...)</li>
                    </ul>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                    6
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-2">Diligence Questions & Decision Making</h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      For ventures moving forward in your pipeline:
                    </p>
                    <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1`}>
                      <li><strong>Diligence Questions:</strong> AI-generated key questions for further consideration and deeper investigation</li>
                      <li><strong>Status Management:</strong> Use the Action buttons to move ventures to "To Diligence" (when status is Analyzed) or Reject</li>
                      <li><strong>Ongoing Evaluation:</strong> Re-analyze companies as new information becomes available</li>
                      <li><strong>Download Reports:</strong> All generated PDF reports can be downloaded for offline review or sharing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Analysis Algorithms Highlight */}
            <div className={`${isDark ? 'bg-gradient-to-br from-gold-900/20 to-orange-900/20 border-gold-700' : 'bg-gradient-to-br from-gold-50 to-orange-50 border-gold-200'} rounded-lg shadow-lg border p-8 mb-8`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center text-gold-600 dark:text-gold-400">
                <Settings className="w-6 h-6 mr-2" />
                Custom Analysis Algorithms
              </h2>
              <p className={`${isDark ? 'text-silver-300' : 'text-navy-700'} mb-4 text-lg font-semibold`}>
                Make output reports tailored to your exact requirements by inputting your specific analysis algorithms.
              </p>
              <p className={`${isDark ? 'text-silver-400' : 'text-navy-600'} mb-4`}>
                Navigate to <strong>Preferences → Custom Analysis Prompts</strong> to input your specific analysis algorithms and criteria. 
                This powerful feature allows you to customize how the AI evaluates ventures across all four categories (Product/Service, Market, Leadership Team, and Financials), 
                ensuring that every generated report reflects your unique analysis methodology and investment requirements.
              </p>
              <div className={`${isDark ? 'bg-navy-800/50' : 'bg-white/50'} rounded-lg p-4 mt-4`}>
                <p className={`${isDark ? 'text-silver-300' : 'text-navy-700'} font-semibold`}>
                  ✓ Customize evaluation criteria for each analysis category<br />
                  ✓ Input your specific analysis algorithms and frameworks<br />
                  ✓ Make output reports specific to your exact requirements<br />
                  ✓ Voice input support for quick customization<br />
                  ✓ Custom prompts clearly marked with an asterisk (*) on analysis buttons
                </p>
              </div>
            </div>

            {/* Comprehensive Analysis Framework */}
            <div className={`${isDark ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} rounded-lg shadow-lg border p-8 mb-8`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
                <BarChart3 className="w-6 h-6 mr-2" />
                Four-Category Analysis Framework
              </h2>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                Every venture analysis is organized into four comprehensive categories, with each category contributing to the overall evaluation score. 
                Customize each category with your specific analysis algorithms to make reports tailored to your exact requirements:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4`}>
                  <h3 className="font-bold text-blue-600 mb-2">1. Product/Service</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    Evaluates solution fit, differentiation, market readiness, and commercial validation
                  </p>
                </div>
                <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4`}>
                  <h3 className="font-bold text-blue-600 mb-2">2. Market</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    Analyzes market size, competitive landscape, positioning, and adoption dynamics
                  </p>
                </div>
                <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4`}>
                  <h3 className="font-bold text-blue-600 mb-2">3. Leadership Team</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    Assesses founder experience, GTM leadership, operations, and governance capabilities
                  </p>
                </div>
                <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4`}>
                  <h3 className="font-bold text-blue-600 mb-2">4. Financials</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    Reviews revenue growth, financial health, capital structure, and valuation metrics
                  </p>
                </div>
              </div>
            </div>

            {/* Key Features for Investors */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Zap className="w-6 h-6 mr-2 text-blue-600" />
                Key Features
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-500" />
                    Custom Analysis Algorithms
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Navigate to <strong>Preferences → Custom Analysis Prompts</strong> to input your specific analysis algorithms and criteria. 
                    This powerful feature allows you to make output reports tailored to your exact requirements. Create personalized analysis prompts 
                    for Product, Market, Team, and Financial evaluation based on your specific investment approach and methodology.
                  </p>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mb-2`}>
                    <strong>Key Benefits:</strong> Customize how the AI evaluates ventures to match your unique analysis framework, ensuring reports 
                    reflect your specific requirements and investment criteria. Custom prompts are clearly indicated with an asterisk (*) on the analysis buttons.
                  </p>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                    <strong>Voice Input:</strong> Use the microphone button next to each prompt field to speak your custom analysis algorithms for quick customization.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Dashboard Filtering
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Filter ventures by status, industry, score range, and other criteria to quickly find the deals that matter most.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-500" />
                    Analysis History
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    View the complete analysis history for each venture, including all generated reports and status changes over time.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
                    Automated Screening
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Proposals are automatically screened against your criteria, saving time by filtering out non-matches before detailed analysis.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-blue-500" />
                    Real-Time Status Tracking
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    The platform automatically polls for report completion every 5 seconds. Watch buttons change color: Blue (ready), 
                    Yellow with spinner (running), Green (completed). No manual refresh needed—everything updates automatically!
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-500" />
                    Professional PDF Reports
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    All reports are generated with high-quality HTML-to-PDF conversion, featuring professional formatting, styled tables, 
                    proper margins, and clean layouts suitable for sharing with your team or portfolio companies.
                  </p>
                </div>
              </div>
            </div>
        </>

        {/* For Founders */}
        {/* Show to everyone, not just authenticated founders */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-600" />
              For Founders: Submitting Your Pitch
            </h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                  1
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-2">Complete Your Company Profile</h3>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    From your dashboard, fill out your company information including:
                  </p>
                  <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1`}>
                    <li>Company name and description</li>
                    <li>Industry and market focus</li>
                    <li>Funding stage and amount seeking</li>
                    <li>Team information</li>
                    <li>Financial information</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                  2
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-2">Upload Your Documents</h3>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Upload your pitch deck and supporting documents for comprehensive evaluation. Documents can include:
                  </p>
                  <ul className={`list-disc list-inside ${isDark ? 'text-gray-400' : 'text-gray-600'} ml-4 space-y-1`}>
                    <li>Pitch deck (PDF format recommended)</li>
                    <li>Financials and financial projections</li>
                    <li>Patent documents (if applicable)</li>
                    <li>Market research and analysis</li>
                    <li>Any additional supporting materials</li>
                  </ul>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2 text-sm italic`}>
                    Note: The AI will also gather public information from your website, LinkedIn profiles, publications, and other online sources.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                  3
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-2">Select Target Investors</h3>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Choose which investors or investor groups should receive your proposal. You can target multiple investors 
                    based on their focus areas and investment criteria.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                  4
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-2">Track Status & Receive Feedback</h3>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Monitor your proposal's progress from your dashboard. You'll see when investors review your proposal 
                    and receive updates on your status. <strong>You will also receive detailed feedback reports</strong> on your 
                    company and pitch, helping you improve your presentation and understand investor perspectives.
                  </p>
                </div>
              </div>
            </div>
          </div>

        {/* Common Questions */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">How accurate is the AI analysis?</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                The AI analysis is trained on thousands of investment decisions and industry standards. However, it should be 
                used as a decision-support tool, not a replacement for human judgment and due diligence.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Can I customize the analysis criteria?</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Yes! Navigate to <strong>Utilities → Investor Preferences</strong> to set your investment criteria, and 
                <strong> Utilities → Investor Prompts</strong> to create custom analysis prompts for Product, Market, Team, and Financial analysis. 
                You can type or use the microphone button for voice input to quickly customize prompts.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">How long does analysis take?</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Initial screening typically completes within minutes. Detailed analysis including all reports can take 5-15 minutes 
                depending on the complexity of the proposal and documents provided. The platform provides real-time status updates—watch for 
                buttons to turn yellow (with spinner) when running, then green when complete. No manual refresh needed!
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Is my data secure?</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Yes. All data is encrypted in transit and at rest. We use enterprise-grade security measures and comply with 
                industry-standard data privacy regulations. Your investment decisions and company information remain confidential.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Can I download reports?</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Yes. All generated reports can be downloaded as PDF files for sharing with your team or for record-keeping purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className={`${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-200'} rounded-lg p-8`}>
          <div className="flex items-start">
            <Mail className="w-8 h-8 text-blue-600 mr-4 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Need More Help?</h2>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-2">
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Email:</strong> <a href="mailto:support@pitchfork.com" className="text-blue-600 hover:underline">support@pitchfork.com</a>
                </p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Response Time:</strong> We typically respond within 24 hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;

