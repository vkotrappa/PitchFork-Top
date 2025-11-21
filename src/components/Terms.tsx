import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Terms: React.FC<TermsProps> = ({ isDark, toggleTheme }) => {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <FileText className="w-20 h-20 text-gold-600 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">Terms & Conditions</h1>
          <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
            Last updated: January 2025
          </p>
        </div>

        <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8 md:p-12 space-y-8`}>
          
          {/* Acceptance */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              By accessing and using PitchFork, you accept and agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, you should not use our service. These terms apply to all users, 
              including investors, founders, and visitors.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              PitchFork provides an AI-driven platform for venture capital analysis and investment decision support. 
              The service includes:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed ml-6`}>
              <li>• Automated screening of venture proposals</li>
              <li>• AI-powered 4-category analysis across 16 subcategories</li>
              <li>• Generation of score cards, reports, and recommendations</li>
              <li>• Pipeline management and tracking tools</li>
              <li>• Integration of public data sources</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts and Registration</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              To use PitchFork, you must create an account. You agree to:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed ml-6`}>
              <li>• Provide accurate and complete information</li>
              <li>• Maintain the security of your account credentials</li>
              <li>• Notify us immediately of any unauthorized access</li>
              <li>• Be responsible for all activities under your account</li>
              <li>• Not share your account with others</li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Acceptable Use Policy</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              You agree NOT to:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed ml-6`}>
              <li>• Use the service for any illegal or unauthorized purpose</li>
              <li>• Upload malicious code, viruses, or harmful content</li>
              <li>• Attempt to gain unauthorized access to the system</li>
              <li>• Reverse engineer or copy any features or functionality</li>
              <li>• Use the service to harass, abuse, or harm others</li>
              <li>• Scrape or extract data through automated means</li>
              <li>• Misrepresent your identity or affiliation</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Intellectual Property Rights</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              <strong>Our Content:</strong> PitchFork and its original content, features, functionality, AI models, 
              and interface design are owned by PitchFork and are protected by copyright, trademark, and other laws.
            </p>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              <strong>Your Content:</strong> You retain ownership of any documents, data, or content you upload. 
              By using our service, you grant us a license to process and analyze this content to provide the service.
            </p>
          </section>

          {/* AI Analysis Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. AI Analysis and Recommendations</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              <strong>Important:</strong> PitchFork provides AI-generated analysis and recommendations as decision support tools only.
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed ml-6`}>
              <li>• AI analysis should not be your sole basis for investment decisions</li>
              <li>• You are responsible for conducting your own due diligence</li>
              <li>• We do not guarantee the accuracy or completeness of AI-generated content</li>
              <li>• Investment decisions carry inherent risks</li>
              <li>• We are not providing financial, legal, or investment advice</li>
            </ul>
          </section>

          {/* Data and Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data and Privacy</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              Your use of PitchFork is also governed by our Privacy Policy. We collect, use, and protect data as 
              described in the Privacy Policy. By using the service, you consent to such data practices.
            </p>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payment and Subscription</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              Paid subscriptions are subject to:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed ml-6`}>
              <li>• Fees are charged in advance on a recurring basis</li>
              <li>• You authorize us to charge your payment method</li>
              <li>• Prices are subject to change with notice</li>
              <li>• No refunds for partial periods or unused features</li>
              <li>• You may cancel anytime, effective at the end of the billing period</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PITCHFORK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR INVESTMENT OPPORTUNITIES, 
              ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Warranty Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Warranty Disclaimer</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, 
              INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              We may terminate or suspend your account and access to the service immediately, without prior notice, 
              for any breach of these Terms. Upon termination, your right to use the service will immediately cease.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Changes to Terms</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              We reserve the right to modify these terms at any time. We will provide notice of significant changes. 
              Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Governing Law</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
              conflict of law provisions. Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          {/* Contact */}
          <section className={`p-6 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              If you have questions about these Terms & Conditions, please contact us:
            </p>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <strong>Email:</strong> <a href="mailto:legal@pitchfork.com" className="text-blue-600 hover:underline">legal@pitchfork.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;

