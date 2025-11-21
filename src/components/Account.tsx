import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronDown, Save, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface AccountProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface AccountData {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const Account: React.FC<AccountProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accountData, setAccountData] = useState<AccountData>({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phoneNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Check user type
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      setIsFounder(profile?.user_type === 'founder');

      // Load user data
      await loadAccountData(currentUser, profile);
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const loadAccountData = async (currentUser: any, profile: any) => {
    try {
      setIsLoading(true);

      // Get data from auth metadata
      const metadata = currentUser.user_metadata || {};

      setAccountData({
        email: currentUser.email || '',
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        companyName: profile?.company_name || '',
        phoneNumber: profile?.phone_number || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading account data:', error);
      setMessage({ type: 'error', text: 'Failed to load account information' });
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        setIsSaving(false);
        return;
      }

      // Validate inputs
      if (!accountData.firstName.trim() || !accountData.lastName.trim()) {
        setMessage({ type: 'error', text: 'First name and last name are required' });
        setIsSaving(false);
        return;
      }

      // Update auth user metadata (first name, last name)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: accountData.firstName,
          last_name: accountData.lastName,
          full_name: `${accountData.firstName} ${accountData.lastName}`,
          company_name: accountData.companyName,
          phone_number: accountData.phoneNumber,
        }
      });

      if (authError) throw authError;

      // Update user_profiles table (company_name, phone_number)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          company_name: accountData.companyName,
          phone_number: accountData.phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', currentUser.id);

      if (profileError) throw profileError;

      // If investor, also update investor_details
      if (!isFounder) {
        const { error: investorError } = await supabase
          .from('investor_details')
          .update({
            name: `${accountData.firstName} ${accountData.lastName}`,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', currentUser.id);

        // Don't throw error if investor_details doesn't exist yet
        if (investorError && !investorError.message.includes('0 rows')) {
          console.error('Error updating investor details:', investorError);
        }
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate password inputs
      if (!accountData.currentPassword) {
        setMessage({ type: 'error', text: 'Please enter your current password' });
        setIsSaving(false);
        return;
      }

      if (!accountData.newPassword) {
        setMessage({ type: 'error', text: 'Please enter a new password' });
        setIsSaving(false);
        return;
      }

      if (accountData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
        setIsSaving(false);
        return;
      }

      if (accountData.newPassword !== accountData.confirmNewPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match' });
        setIsSaving(false);
        return;
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountData.email,
        password: accountData.currentPassword,
      });

      if (signInError) {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
        setIsSaving(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: accountData.newPassword
      });

      if (updateError) throw updateError;

      // Clear password fields
      setAccountData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));

      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-navy-900'}`}>
      {/* Navigation */}
      <nav className={`${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="PitchFork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                PitchFork
              </div>
            </div>
            
            <div className="flex items-center space-x-4 ml-auto">
              {/* Navigation Menu */}
              {!isFounder && (
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
                          Investor Preferences
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
                      className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                    >
                      <User className="w-4 h-4 mr-1" />
                      User <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    {showUserMenu && (
                      <div className={`absolute top-full right-0 mt-2 w-32 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} z-50`}>
                        <Link to="/account" className={`block px-4 py-2 text-sm text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20`}>
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
                </nav>
              )}

              {/* Founder Navigation */}
              {isFounder && (
                <nav className="hidden md:flex items-center space-x-6">
                  <Link to="/founder-dashboard" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Dashboard</Link>
                  <Link to="/help" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Help</Link>
                  
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
                        <Link to="/account" className={`block px-4 py-2 text-sm text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20`}>
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
                </nav>
              )}

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              <Link
                to={isFounder ? "/founder-dashboard" : "/dashboard"}
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
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

      {/* Account Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <User className="w-10 h-10 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Account Settings</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your profile information and password
              </p>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? isDark ? 'bg-green-900/20 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-800'
              : isDark ? 'bg-red-900/20 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Information Form */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 mb-8`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <User className="w-6 h-6 mr-2 text-blue-600" />
            Profile Information
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <input
                type="email"
                value={accountData.email}
                readOnly
                className={`w-full px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                } border`}
              />
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Email address cannot be changed
              </p>
            </div>

            {/* First Name and Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={accountData.firstName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={accountData.lastName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={accountData.companyName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={accountData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Lock className="w-6 h-6 mr-2 text-blue-600" />
            Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={accountData.currentPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={accountData.newPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Must be at least 6 characters long
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmNewPassword"
                  value={accountData.confirmNewPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Change Password Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-5 h-5 mr-2" />
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Account;

