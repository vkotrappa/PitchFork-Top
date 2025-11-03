import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Mail } from 'lucide-react';

interface PricingProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Pricing: React.FC<PricingProps> = ({ isDark, toggleTheme }) => {
  return (
    <div className={`min-h-screen ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-slate-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold text-blue-600">
                Pitch Fork
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
          <h1 className="text-5xl font-bold mb-6 text-blue-600">Simple, Transparent Pricing</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto`}>
            Pay only for what you use. No hidden fees, no subscriptions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* Investors */}
          <div className={`${isDark ? 'bg-navy-900 border-blue-600' : 'bg-white border-blue-400'} rounded-xl shadow-lg border-2 p-8 relative`}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
              For Investors
            </div>
            <h3 className="text-2xl font-bold mb-4 text-center mt-4">Investor Plan</h3>
            <div className="mb-6 text-center">
              <span className="text-5xl font-bold text-blue-600">$100</span>
              <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mt-2`}>
                for every 25 companies
              </p>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-6 text-center`}>
              Pay as you receive company proposals for analysis
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Receive up to 25 company proposals</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> 4-category comprehensive AI analysis</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> All report types (Score Card, Detail Report, Diligence Questions, Founder Report)</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Automated screening</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Custom analysis prompts</li>
            </ul>
            <Link to="/signup" className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              Get Started
            </Link>
          </div>

          {/* Founders */}
          <div className={`${isDark ? 'bg-navy-900 border-orange-600' : 'bg-white border-orange-400'} rounded-xl shadow-lg border-2 p-8 relative`}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-600 text-white rounded-full text-sm font-semibold">
              For Founders
            </div>
            <h3 className="text-2xl font-bold mb-4 text-center mt-4">Founder Plan</h3>
            <div className="mb-6 text-center">
              <span className="text-5xl font-bold text-orange-600">$50</span>
              <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'} mt-2`}>
                per submission
              </p>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-6 text-center`}>
              Submit your venture to up to 3 investors per submission
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Submit to up to 3 investors</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Comprehensive AI analysis by each investor</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Receive detailed feedback reports</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Track submission status</li>
              <li className="flex items-start"><Check className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Pay per submission, no subscriptions</li>
            </ul>
            <Link to="/signup" className="block w-full text-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold">
              Get Started
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl shadow-lg border p-8 text-center max-w-3xl mx-auto`}>
          <h2 className="text-2xl font-bold mb-4 text-blue-600">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div>
              <h3 className="font-bold mb-2 text-blue-600">For Investors:</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Pay $100 each time you receive a batch of 25 company proposals. Each batch includes full AI analysis, 
                all report types, and unlimited access to those 25 companies.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-blue-600">For Founders:</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Pay $50 per submission to send your venture to up to 3 investors. Each investor will receive your 
                pitch deck and will be able to analyze your company.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

