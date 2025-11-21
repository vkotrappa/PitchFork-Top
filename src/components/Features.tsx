import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Target, Zap, BarChart3, Users, Shield, FileText } from 'lucide-react';

interface FeaturesProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Features: React.FC<FeaturesProps> = ({ isDark, toggleTheme }) => {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-slate-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="PitchFork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                PitchFork
              </div>
            </div>
            
            <Link to="/" className="flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gold-gradient bg-clip-text text-transparent">Platform Features</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto`}>
            Everything you need to streamline venture analysis and make informed investment decisions
          </p>
        </div>

        <div className="space-y-16">
          {/* Automated Screening */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Target className="w-12 h-12 text-blue-600 mr-4" />
              <h2 className="text-3xl font-bold">Automated Screening</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Set your custom investment criteria and let AI automatically filter incoming proposals before deep analysis.
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Revenue thresholds and financial requirements</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Industry and sector preferences</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Geographic location filtering</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Funding stage and company maturity</li>
            </ul>
          </div>

          {/* 4-Category Analysis */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Zap className="w-12 h-12 text-gold-500 mr-4" />
              <h2 className="text-3xl font-bold">Comprehensive 4-Category AI Analysis</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-6`}>
              Every venture receives detailed evaluation across 16 subcategories organized into four key dimensions:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h3 className="text-xl font-bold mb-3 text-blue-600">1. Product/Service</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Problem-Solution fit</li>
                  <li>• Differentiation & Defensibility</li>
                  <li>• Product–Market Readiness</li>
                  <li>• Commercial Traction & Validation</li>
                </ul>
              </div>
              <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h3 className="text-xl font-bold mb-3 text-green-600">2. Market</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Serviceable Market Size & Growth</li>
                  <li>• Competitive Landscape</li>
                  <li>• Competitive Advantage & Positioning</li>
                  <li>• Adoption Drivers & Risks</li>
                </ul>
              </div>
              <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h3 className="text-xl font-bold mb-3 text-orange-600">3. Leadership Team</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Founder's experience</li>
                  <li>• Go to Market leadership</li>
                  <li>• Execution/Operations</li>
                  <li>• Finance & Governance</li>
                </ul>
              </div>
              <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h3 className="text-xl font-bold mb-3 text-purple-600">4. Financials</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Revenue & Growth</li>
                  <li>• Financial Health & Burn</li>
                  <li>• Capital Raised & Structure</li>
                  <li>• Valuation & Benchmarking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Multiple Report Types */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <FileText className="w-12 h-12 text-purple-600 mr-4" />
              <h2 className="text-3xl font-bold">Multiple Report Types</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Generate professional PDF reports instantly with high-quality HTML-to-PDF formatting. Reports feature professional styling, 
              properly formatted tables, clean layouts, and are ready for sharing or printing.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h4 className="font-bold mb-2">Comprehensive Score Card</h4>
                <p className="text-sm">Overall evaluation scores across all four categories with investment recommendations</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h4 className="font-bold mb-2">Detailed Analysis Report</h4>
                <p className="text-sm">In-depth analysis covering all findings, insights, and supporting data</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h4 className="font-bold mb-2">Diligence Questions</h4>
                <p className="text-sm">AI-generated targeted questions for further investigation</p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
                <h4 className="font-bold mb-2">Founder Feedback Report</h4>
                <p className="text-sm">Constructive feedback to share with entrepreneurs</p>
              </div>
            </div>
          </div>

          {/* Public Data Integration */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <BarChart3 className="w-12 h-12 text-green-600 mr-4" />
              <h2 className="text-3xl font-bold">Public Data Integration</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              AI goes beyond submitted documents to gather comprehensive information from multiple public sources.
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Company websites and product pages</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> LinkedIn profiles of founders and team members</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Industry publications and press releases</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Market research and competitive intelligence</li>
            </ul>
          </div>

          {/* Dashboard & Pipeline Management */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Users className="w-12 h-12 text-orange-600 mr-4" />
              <h2 className="text-3xl font-bold">Dashboard & Pipeline Management</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Track all ventures through your investment pipeline with clear status indicators.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-100 dark:bg-navy-800 rounded-lg">
                <div className="font-bold text-lg mb-1">Open</div>
                <p className="text-sm">New proposals</p>
              </div>
              <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <div className="font-bold text-lg mb-1">Screened</div>
                <p className="text-sm">Passed filters</p>
              </div>
              <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <div className="font-bold text-lg mb-1">Analyzing</div>
                <p className="text-sm">AI in progress</p>
              </div>
              <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <div className="font-bold text-lg mb-1">Reject</div>
                <p className="text-sm">Not a fit</p>
              </div>
              <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <div className="font-bold text-lg mb-1">Diligence</div>
                <p className="text-sm">Deep review</p>
              </div>
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <div className="font-bold text-lg mb-1">Invest</div>
                <p className="text-sm">Top candidates</p>
              </div>
            </div>
          </div>

          {/* Custom Analysis Prompts */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Target className="w-12 h-12 text-gold-500 mr-4" />
              <h2 className="text-3xl font-bold">Custom Analysis Prompts</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Personalize how AI analyzes ventures by creating custom prompts for each analysis category.
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Create custom prompts for Product, Market, Team, and Financial analysis</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Voice input support for quick prompt customization</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Custom prompts clearly marked with asterisk (*) on buttons</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Reports indicate when custom investor prompts are used</li>
            </ul>
          </div>

          {/* Real-Time Status Tracking */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Zap className="w-12 h-12 text-yellow-500 mr-4" />
              <h2 className="text-3xl font-bold">Real-Time Status Tracking</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Visual feedback and automatic updates keep you informed without manual refreshing.
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Button color states: Blue (ready), Yellow (running), Green (completed)</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Spinner icons appear when analysis is in progress</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Automatic polling updates buttons and reports every 5 seconds</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> No manual refresh needed—everything updates automatically</li>
            </ul>
          </div>

          {/* Security */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Shield className="w-12 h-12 text-blue-600 mr-4" />
              <h2 className="text-3xl font-bold">Enterprise-Grade Security</h2>
            </div>
            <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Your investment data and founder information are protected with the highest security standards.
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> End-to-end encryption for all data</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Secure document storage and transmission</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Role-based access control</li>
              <li className="flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Regular security audits and monitoring</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <Link to="/signup" className="inline-flex items-center px-8 py-4 bg-gold-gradient text-white rounded-lg text-lg font-semibold hover:shadow-gold transition-all duration-300">
            Sign Up Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Features;

