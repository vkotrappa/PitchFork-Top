import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';

interface PrivacyProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Privacy: React.FC<PrivacyProps> = ({ isDark, toggleTheme }) => {
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
          <Shield className="w-20 h-20 text-gold-600 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className={`text-lg ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
            Last updated: January 2025
          </p>
        </div>

        <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8 md:p-12 space-y-8`}>
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              At PitchFork, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our AI-driven VC investment platform. Please read this privacy 
              policy carefully. By using PitchFork, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center mb-4">
              <Database className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold">Information We Collect</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Account Information</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
                  When you register, we collect your name, email address, company name, phone number, and account credentials.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Investment Data</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
                  We collect investment criteria, preferences, and analysis data related to venture proposals you review.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Company Documents</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
                  Pitch decks, financial documents, and other materials submitted by founders for analysis.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Usage Information</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
                  We collect information about how you use the platform, including features accessed and time spent.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center mb-4">
              <UserCheck className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold">How We Use Your Information</h2>
            </div>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              <li>• Provide and maintain the PitchFork platform</li>
              <li>• Process and analyze venture proposals using AI</li>
              <li>• Generate analysis reports and recommendations</li>
              <li>• Customize and improve our services</li>
              <li>• Communicate with you about updates and features</li>
              <li>• Ensure security and prevent fraud</li>
              <li>• Comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center mb-4">
              <Lock className="w-6 h-6 text-orange-600 mr-3" />
              <h2 className="text-2xl font-bold">Data Security</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              We implement enterprise-grade security measures to protect your data:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              <li>• End-to-end encryption for all data transmission</li>
              <li>• Secure encrypted storage for documents and data</li>
              <li>• Role-based access controls</li>
              <li>• Regular security audits and monitoring</li>
              <li>• Secure authentication and password requirements</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <div className="flex items-center mb-4">
              <Eye className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold">Data Sharing and Disclosure</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              We do not sell your personal information. We may share data only in these circumstances:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              <li>• <strong>With your consent:</strong> When you explicitly authorize data sharing</li>
              <li>• <strong>Service providers:</strong> Third-party services that help us operate (AI providers, hosting)</li>
              <li>• <strong>Legal requirements:</strong> When required by law or to protect rights and safety</li>
              <li>• <strong>Business transfers:</strong> In connection with mergers or acquisitions (with notice)</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              You have the following rights regarding your data:
            </p>
            <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              <li>• Access and review your personal information</li>
              <li>• Correct inaccurate or incomplete data</li>
              <li>• Delete your account and associated data</li>
              <li>• Export your data in a portable format</li>
              <li>• Opt-out of marketing communications</li>
              <li>• Object to processing in certain circumstances</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              We retain your information for as long as your account is active or as needed to provide services. 
              When you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, 
              except where required to retain it for legal or regulatory compliance.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              PitchFork is not intended for users under the age of 18. We do not knowingly collect information from children. 
              If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed`}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section className={`p-6 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed mb-4`}>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <strong>Email:</strong> <a href="mailto:privacy@pitchfork.com" className="text-blue-600 hover:underline">privacy@pitchfork.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

