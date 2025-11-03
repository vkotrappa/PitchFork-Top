import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, ChevronDown, CreditCard as Edit } from 'lucide-react';
import { supabase, getCurrentUser, signOut } from '../lib/supabase';

interface CompanyListProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  email?: string;
  status?: string;
  date_submitted: string;
}

const CompanyList: React.FC<CompanyListProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUtilitiesMenu, setShowUtilitiesMenu] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      await loadCompanies();
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry, email, status, date_submitted')
        .order('date_submitted', { ascending: false });

      if (error) {
        console.error('Error loading companies:', error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleEditCompany = (company: Company) => {
    navigate('/edit-company', { state: { company } });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-blue-600">Investor Portal</h1>
            </div>

            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Dashboard</Link>

                <div className="relative">
                  <button
                    onClick={() => setShowUtilitiesMenu(!showUtilitiesMenu)}
                    className={`flex items-center text-blue-600 font-medium transition-colors`}
                  >
                    Utilities <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  {showUtilitiesMenu && (
                    <div className={`absolute top-full left-0 mt-2 w-48 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} z-50`}>
                      <Link to="/investor-preferences" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                        Investor Preferences
                      </Link>
                      <Link to="/edit-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                        Edit Prompts
                      </Link>
                      <Link to="/investor-prompts" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
                        Investor Prompts
                      </Link>
                    </div>
                  )}
                </div>

                <Link to="/help" className={`${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}>Help</Link>

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
                      <Link to="/account" className={`block px-4 py-2 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} transition-colors`}>
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

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              <Link
                to="/dashboard"
                className={`flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {(showUserMenu || showUtilitiesMenu) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowUserMenu(false);
              setShowUtilitiesMenu(false);
            }}
          />
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Companies</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a company to edit its information
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading companies...</p>
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-12 text-center`}>
            <Building2 className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
            <h3 className="text-xl font-semibold mb-2">No Companies Found</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              There are no companies in the system yet.
            </p>
          </div>
        ) : (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Date Submitted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {companies.map((company) => (
                    <tr key={company.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-blue-600 mr-3" />
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {company.industry || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {company.email || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.status === 'approved' ? 'bg-green-100 text-green-800' :
                          company.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          company.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {company.status?.replace('_', ' ') || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(company.date_submitted).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyList;
