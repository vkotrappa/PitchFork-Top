import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, Calendar, Mail, FileText } from 'lucide-react';

interface DemoProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Demo: React.FC<DemoProps> = ({ isDark, toggleTheme }) => {
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Video className="w-20 h-20 text-gold-600 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-6 bg-gold-gradient bg-clip-text text-transparent">Schedule a Demo</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto`}>
            See PitchFork in action with a personalized demo tailored to your investment needs
          </p>
        </div>

        <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-12 mb-12`}>
          <h2 className="text-3xl font-bold mb-8 text-center">What You'll See in the Demo</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
              <FileText className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Live Analysis Walkthrough</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Watch real-time AI analysis of a sample venture across all 4 categories with detailed subcategory breakdowns
              </p>
            </div>
            
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
              <FileText className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Sample Reports</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Review actual score cards, detailed analysis reports, diligence questions, and founder feedback examples
              </p>
            </div>
            
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
              <FileText className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Dashboard Overview</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Explore pipeline management, filtering capabilities, and status tracking across your venture portfolio
              </p>
            </div>
            
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-slate-50'}`}>
              <FileText className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Customization Options</h3>
              <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Learn how to set screening criteria, customize analysis prompts, and configure investor preferences
              </p>
            </div>
          </div>

          <div className={`p-8 rounded-xl ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border mb-8`}>
            <h3 className="text-2xl font-bold mb-4 text-center">Demo Includes:</h3>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-700'} max-w-2xl mx-auto`}>
              <li className="flex items-start">• 30-45 minute personalized session</li>
              <li className="flex items-start">• Q&A with product specialists</li>
              <li className="flex items-start">• Review of your specific use cases</li>
              <li className="flex items-start">• Pricing and implementation discussion</li>
              <li className="flex items-start">• Access to sample reports after demo</li>
            </ul>
          </div>
        </div>

        {/* Contact Section */}
        <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
          <Calendar className="w-16 h-16 text-gold-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to See PitchFork in Action?</h2>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-8`}>
            Contact us to schedule your personalized demo at a time that works for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:hello@pitchfork.com?subject=Demo Request" 
              className="inline-flex items-center justify-center px-8 py-4 bg-gold-gradient text-white rounded-lg text-lg font-semibold hover:shadow-gold transition-all duration-300"
            >
              <Mail className="w-5 h-5 mr-2" />
              Request Demo
            </a>
            <Link 
              to="/signup" 
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;

