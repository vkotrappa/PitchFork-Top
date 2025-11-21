import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { signIn, supabase } from '../lib/supabase';

interface LoginPageProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ isDark, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check user type and redirect accordingly
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('user_id', data.user.id)
          .single();
        
        if (profile?.user_type === 'founder') {
          navigate('/founder-dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Forgot password functionality would be implemented here');
  };

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-navy-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img src="/pitch-fork3.png" alt="PitchFork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                PitchFork
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm font-semibold`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-4">
              LOGIN PAGE
            </h2>
            <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-navy-600'}`}>
              Sign in to your PitchFork account
            </p>
          </div>

          <div className={`${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-silver-200'} py-8 px-6 shadow-financial rounded-xl border`}>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-danger-100 border border-danger-400 text-danger-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors ${
                    isDark 
                      ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                      : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                  }`}
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className={`block text-sm font-semibold ${isDark ? 'text-silver-300' : 'text-navy-700'} mb-2`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors ${
                      isDark 
                        ? 'bg-navy-700 border-navy-600 text-white placeholder-silver-400' 
                        : 'bg-white border-silver-300 text-navy-900 placeholder-navy-500'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDark ? 'text-silver-400 hover:text-silver-300' : 'text-navy-500 hover:text-navy-700'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gold-gradient text-white py-3 px-6 rounded-lg font-bold hover:shadow-gold focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-financial text-lg"
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </button>

              {/* Forgot Password Button */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-gold-600 hover:text-gold-700 font-semibold transition-colors"
              >
                Forgot Password?
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className={`text-sm ${isDark ? 'text-silver-300' : 'text-navy-600'}`}>
                New?{' '}
                <Link 
                  to="/signup" 
                  className="text-gold-600 hover:text-gold-700 font-semibold transition-colors"
                >
                  Sign Up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;