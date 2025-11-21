import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Key, Database, Server, Eye, CheckCircle } from 'lucide-react';

interface SecurityProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Security: React.FC<SecurityProps> = ({ isDark, toggleTheme }) => {
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
          <Shield className="w-20 h-20 text-gold-600 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-6 bg-gold-gradient bg-clip-text text-transparent">Security at PitchFork</h1>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto`}>
            Enterprise-grade security measures to protect your sensitive investment data and founder information
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Data Encryption */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Lock className="w-12 h-12 text-blue-600 mr-4" />
              <h2 className="text-2xl font-bold">Data Encryption</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              All data is protected with industry-standard encryption:
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>TLS 1.3</strong> for data in transit</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>AES-256 encryption</strong> for data at rest</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>End-to-end encryption</strong> for sensitive documents</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Encrypted backups</strong> and redundancy</span>
              </li>
            </ul>
          </div>

          {/* Access Control */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Key className="w-12 h-12 text-green-600 mr-4" />
              <h2 className="text-2xl font-bold">Access Control</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Strict controls ensure only authorized users access data:
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Role-based access control (RBAC)</strong> for users</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Multi-factor authentication (MFA)</strong> available</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Session management</strong> with automatic timeouts</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Password requirements</strong> enforced</span>
              </li>
            </ul>
          </div>

          {/* Infrastructure Security */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Server className="w-12 h-12 text-purple-600 mr-4" />
              <h2 className="text-2xl font-bold">Infrastructure Security</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Our platform is built on secure, enterprise-grade infrastructure:
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Cloud infrastructure</strong> with 99.9% uptime</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>DDoS protection</strong> and firewall rules</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Regular security patches</strong> and updates</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Network isolation</strong> and segmentation</span>
              </li>
            </ul>
          </div>

          {/* Data Privacy */}
          <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-8`}>
            <div className="flex items-center mb-6">
              <Eye className="w-12 h-12 text-orange-600 mr-4" />
              <h2 className="text-2xl font-bold">Data Privacy</h2>
            </div>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} mb-4`}>
              Your data privacy is paramount:
            </p>
            <ul className={`space-y-3 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Data segregation</strong> between users</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>No data selling</strong> to third parties</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Privacy-first AI processing</strong></span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span><strong>Right to delete</strong> your data anytime</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Additional Security Measures */}
        <div className={`${isDark ? 'bg-navy-900' : 'bg-white'} rounded-xl shadow-lg p-12 mb-16`}>
          <div className="flex items-center mb-8">
            <Database className="w-12 h-12 text-gold-600 mr-4" />
            <h2 className="text-3xl font-bold">Additional Security Measures</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Monitoring & Auditing</h3>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                <li>• 24/7 security monitoring and threat detection</li>
                <li>• Comprehensive audit logs for all system access</li>
                <li>• Regular security vulnerability assessments</li>
                <li>• Penetration testing by third-party experts</li>
                <li>• Incident response and disaster recovery plans</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">Compliance & Standards</h3>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                <li>• Industry-standard security frameworks</li>
                <li>• Regular compliance audits</li>
                <li>• Data protection impact assessments</li>
                <li>• Vendor security assessments</li>
                <li>• Employee security training programs</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Best Practices for Users */}
        <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-xl border p-12`}>
          <h2 className="text-3xl font-bold mb-6 text-center">Security Best Practices for Users</h2>
          <p className={`text-center ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-8 max-w-3xl mx-auto`}>
            While we provide robust security, you play a crucial role in protecting your data:
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
              <h4 className="font-bold mb-3">Use Strong Passwords</h4>
              <p className={`text-sm ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Create complex, unique passwords and change them regularly
              </p>
            </div>
            
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
              <h4 className="font-bold mb-3">Enable MFA</h4>
              <p className={`text-sm ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Add an extra layer of security with multi-factor authentication
              </p>
            </div>
            
            <div className={`p-6 rounded-lg ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
              <h4 className="font-bold mb-3">Protect Your Account</h4>
              <p className={`text-sm ${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
                Never share credentials and log out when not in use
              </p>
            </div>
          </div>
        </div>

        {/* Contact Security Team */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Questions About Security?</h2>
          <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} mb-8`}>
            Our security team is here to help answer any questions or concerns.
          </p>
          <a 
            href="mailto:security@pitchfork.com" 
            className="inline-flex items-center px-8 py-4 bg-gold-gradient text-white rounded-lg text-lg font-semibold hover:shadow-gold transition-all duration-300"
          >
            <Shield className="w-5 h-5 mr-2" />
            Contact Security Team
          </a>
        </div>
      </div>
    </div>
  );
};

export default Security;

