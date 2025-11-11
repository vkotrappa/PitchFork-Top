import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, ChevronDown, Save, Building2, Target, Mail, BarChart3 } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';
import SectorTree from './SectorTree';

interface InvestorPreferencesProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface InvestorData {
  name: string;
  email: string;
  firm_name: string;
  focus_areas: string;
  industry_sectors?: Array<{sector: string, sub_sector: string}>;
  geography?: string[];
  valuation_range?: string;
  typical_check_size?: string;
  ownership_leadership?: string[];
  minimum_arr?: number; // Default/fallback minimum ARR
  sector_min_arr?: Array<{sector: string, sub_sector: string, min_arr: number}>; // Per-sector/sub-sector min ARR
  business_model?: string[];
}

const InvestorPreferences: React.FC<InvestorPreferencesProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [investorData, setInvestorData] = useState<InvestorData>({
    name: '',
    email: '',
    firm_name: '',
    focus_areas: '',
    industry_sectors: [],
    geography: [],
    valuation_range: '$3M to $30M',
    typical_check_size: '$50K to $500K',
    ownership_leadership: [],
    minimum_arr: 250000,
    sector_min_arr: [],
    business_model: [],
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Check if user is an investor
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profile?.user_type !== 'investor') {
        navigate('/founder-dashboard');
        return;
      }

      await loadInvestorDetails();
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const loadInvestorDetails = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('investor_details')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading investor details:', error);
        setMessage({ type: 'error', text: 'Failed to load your details' });
        return;
      }

      if (data) {
        setInvestorData({
          name: data.name || '',
          email: data.email || '',
          firm_name: data.firm_name || '',
          focus_areas: data.focus_areas || '',
          industry_sectors: data.industry_sectors || [],
          geography: Array.isArray(data.geography) ? data.geography : (data.geography ? [data.geography] : []),
          valuation_range: data.valuation_range || '$3M to $30M',
          typical_check_size: data.typical_check_size || '$50K to $500K',
          ownership_leadership: data.ownership_leadership || [],
          minimum_arr: data.minimum_arr || 250000,
          sector_min_arr: data.sector_min_arr || [],
          business_model: Array.isArray(data.business_model) ? data.business_model : (data.business_model ? [data.business_model] : []),
        });
      } else {
        // Pre-fill with user data if no investor_details record exists
        setInvestorData(prev => ({
          ...prev,
          name: currentUser.user_metadata?.full_name || '',
          email: currentUser.email || '',
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvestorData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInvestorData(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined
    }));
  };

  const handleOwnershipChange = (value: string, checked: boolean) => {
    setInvestorData(prev => {
      const current = prev.ownership_leadership || [];
      if (checked) {
        return { ...prev, ownership_leadership: [...current, value] };
      } else {
        return { ...prev, ownership_leadership: current.filter(v => v !== value) };
      }
    });
  };

  const handleGeographyChange = (value: string, checked: boolean) => {
    setInvestorData(prev => {
      const current = prev.geography || [];
      if (checked) {
        return { ...prev, geography: [...current, value] };
      } else {
        return { ...prev, geography: current.filter(v => v !== value) };
      }
    });
  };

  const handleBusinessModelChange = (value: string, checked: boolean) => {
    setInvestorData(prev => {
      const current = prev.business_model || [];
      if (checked) {
        return { ...prev, business_model: [...current, value] };
      } else {
        return { ...prev, business_model: current.filter(v => v !== value) };
      }
    });
  };

  const updateSectorMinArr = (sector: string, subSector: string, minArr: number) => {
    setInvestorData(prev => {
      const current = prev.sector_min_arr || [];
      const existingIndex = current.findIndex(
        item => item.sector === sector && item.sub_sector === subSector
      );
      
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = { sector, sub_sector: subSector, min_arr: minArr };
        return { ...prev, sector_min_arr: updated };
      } else {
        return { ...prev, sector_min_arr: [...current, { sector, sub_sector: subSector, min_arr: minArr }] };
      }
    });
  };

  const getSectorMinArr = (sector: string, subSector: string): number => {
    const sectorMinArr = investorData.sector_min_arr || [];
    const found = sectorMinArr.find(
      item => item.sector === sector && item.sub_sector === subSector
    );
    return found ? found.min_arr : (investorData.minimum_arr || 250000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from('investor_details')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('investor_details')
          .update({
            name: investorData.name,
            email: investorData.email,
            firm_name: investorData.firm_name,
            focus_areas: investorData.focus_areas,
            industry_sectors: investorData.industry_sectors || [],
            geography: investorData.geography || [],
            valuation_range: investorData.valuation_range || '$3M to $30M',
            typical_check_size: investorData.typical_check_size || '$50K to $500K',
            ownership_leadership: investorData.ownership_leadership || [],
            minimum_arr: investorData.minimum_arr || 250000,
            sector_min_arr: investorData.sector_min_arr || [],
            business_model: investorData.business_model || [],
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('investor_details')
          .insert([{
            user_id: currentUser.id,
            name: investorData.name,
            email: investorData.email,
            firm_name: investorData.firm_name,
            focus_areas: investorData.focus_areas,
            industry_sectors: investorData.industry_sectors || [],
            geography: investorData.geography || [],
            valuation_range: investorData.valuation_range || '$3M to $30M',
            typical_check_size: investorData.typical_check_size || '$50K to $500K',
            ownership_leadership: investorData.ownership_leadership || [],
            minimum_arr: investorData.minimum_arr || 250000,
            sector_min_arr: investorData.sector_min_arr || [],
            business_model: investorData.business_model || [],
          }]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCompanyMatch = () => {
    const url = '/company-investor-match';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/dashboard"
              className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors font-semibold`}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>

            <div className="flex items-center space-x-6">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors font-semibold`}
                >
                  <User className="w-4 h-4 mr-1" />
                  {user?.email} <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {showUserMenu && (
                  <div className={`absolute top-full right-0 mt-2 w-48 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border z-50`}>
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors font-semibold`}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Investor Preferences
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Update your investment preferences and profile information
          </p>
        </header>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
              : isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Preferences Form */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <form onSubmit={handleSave}>
            <div className="p-5">
              <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Your Investor Profile
              </h2>

              <div className="space-y-4">
                {/* Basic Info - Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={investorData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={investorData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Firm Name */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      <Building2 className="w-3 h-3 inline mr-1" />
                      Firm Name
                    </label>
                    <input
                      type="text"
                      name="firm_name"
                      value={investorData.firm_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="e.g., TechVentures Capital"
                    />
                  </div>

                  {/* Focus Areas */}
                  <div>
                    <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      <Target className="w-3 h-3 inline mr-1" />
                      Focus Areas
                    </label>
                    <input
                      type="text"
                      name="focus_areas"
                      value={investorData.focus_areas}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="e.g., SaaS, AI, Enterprise Software, FinTech"
                    />
                  </div>
                </div>

                {/* Investment Matching Criteria Section */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                  <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Investment Focus
                  </h3>

                  {/* Industry Sectors and ARR by Sector - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Industry Sectors */}
                    <div>
                      <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Industry Sectors & Sub-Sectors
                      </label>
                      <SectorTree
                        selectedSectors={investorData.industry_sectors || []}
                        onChange={(selected) => setInvestorData(prev => ({ ...prev, industry_sectors: selected }))}
                        isDark={isDark}
                        multiSelect={true}
                      />
                    </div>

                    {/* ARR Section */}
                    <div>
                      {/* Minimum ARR */}
                      <div className="mb-3">
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                          Minimum ARR (Default)
                        </label>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>$</span>
                          <input
                            type="number"
                            name="minimum_arr"
                            value={investorData.minimum_arr || ''}
                            onChange={handleNumberChange}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-lg border ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="250000"
                          />
                        </div>
                      </div>

                      {/* Per-Sector ARR Customization */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                          Custom ARR by Sector (Optional)
                        </label>
                        {(investorData.industry_sectors || []).length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2.5 text-sm" style={{
                            backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(0, 0, 0, 0.02)'
                          }}>
                            {investorData.industry_sectors?.map((item, index) => {
                              const sectorMinArr = investorData.sector_min_arr || [];
                              const hasCustomValue = sectorMinArr.some(
                                s => s.sector === item.sector && s.sub_sector === item.sub_sector
                              );
                              return (
                              <div key={`${item.sector}-${item.sub_sector}-${index}`} className="flex items-center gap-2 py-1">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {item.sector}
                                    </div>
                                    {hasCustomValue && (
                                      <span className={`text-xs px-1 py-0.5 rounded flex-shrink-0 ${
                                        isDark 
                                          ? 'bg-blue-900 text-blue-200' 
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.sub_sector}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>$</span>
                                  <input
                                    type="number"
                                    value={(() => {
                                      const sectorMinArr = investorData.sector_min_arr || [];
                                      const found = sectorMinArr.find(
                                        s => s.sector === item.sector && s.sub_sector === item.sub_sector
                                      );
                                      return found ? found.min_arr : '';
                                    })()}
                                    onChange={(e) => {
                                      const inputValue = e.target.value.trim();
                                      if (inputValue === '') {
                                        setInvestorData(prev => {
                                          const current = prev.sector_min_arr || [];
                                          return {
                                            ...prev,
                                            sector_min_arr: current.filter(
                                              s => !(s.sector === item.sector && s.sub_sector === item.sub_sector)
                                            )
                                          };
                                        });
                                      } else {
                                        const value = parseFloat(inputValue);
                                        if (!isNaN(value)) {
                                          updateSectorMinArr(item.sector, item.sub_sector, value);
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const inputValue = e.target.value.trim();
                                      if (inputValue === '') {
                                        e.target.value = '';
                                      }
                                    }}
                                    className={`w-20 px-2 py-1 rounded border text-xs ${
                                      isDark
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-1 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder={String(investorData.minimum_arr || 250000)}
                                  />
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`border rounded-lg p-4 text-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Select sectors above to customize ARR
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Filters - Single Row */}
                  <div className="mb-4">
                    <div className="flex flex-wrap items-end gap-6">
                      {/* Geography */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          Geography
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {['US', 'Europe', 'India'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(investorData.geography || []).includes(option)}
                                onChange={(e) => handleGeographyChange(option, e.target.checked)}
                                className={`mr-1.5 w-3.5 h-3.5 ${
                                  isDark ? 'text-blue-500' : 'text-blue-600'
                                } focus:ring-blue-500`}
                              />
                              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Business Model */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          Business Model
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {['B2B', 'B2C'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(investorData.business_model || []).includes(option)}
                                onChange={(e) => handleBusinessModelChange(option, e.target.checked)}
                                className={`mr-1.5 w-3.5 h-3.5 ${
                                  isDark ? 'text-blue-500' : 'text-blue-600'
                                } focus:ring-blue-500`}
                              />
                              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Ownership/Leadership */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          Ownership/Leadership
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {['General', 'Women', 'Minority'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(investorData.ownership_leadership || []).includes(option)}
                                onChange={(e) => handleOwnershipChange(option, e.target.checked)}
                                className={`mr-1.5 w-3.5 h-3.5 ${
                                  isDark ? 'text-blue-500' : 'text-blue-600'
                                } focus:ring-blue-500`}
                              />
                              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Fields - Single Row */}
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Valuation Range */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                          Valuation Range
                        </label>
                        <input
                          type="text"
                          name="valuation_range"
                          value={investorData.valuation_range || ''}
                          onChange={handleInputChange}
                          className={`w-full px-2 py-1.5 text-xs rounded-lg border ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="$3M to $30M"
                        />
                      </div>

                      {/* Typical Check Size */}
                      <div>
                        <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                          Typical Check Size
                        </label>
                        <input
                          type="text"
                          name="typical_check_size"
                          value={investorData.typical_check_size || ''}
                          onChange={handleInputChange}
                          className={`w-full px-2 py-1.5 text-xs rounded-lg border ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="$50K to $500K"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={`px-6 py-4 ${isDark ? 'bg-gray-750 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    to="/dashboard"
                    className={`px-4 py-2 rounded-lg ${
                      isDark
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    } transition-colors`}
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenCompanyMatch}
                    className="inline-flex items-center px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Match Companies
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center ${
                    isSaving
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : isDark
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-blue-900 bg-opacity-30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
          <h3 className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
            Why update your preferences?
          </h3>
          <ul className={`text-sm space-y-1 ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
            <li>• Founders can see your investment focus when selecting investors</li>
            <li>• Your firm name and bio help founders understand your background</li>
            <li>• Accurate information leads to better-matched pitch deck submissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvestorPreferences;

