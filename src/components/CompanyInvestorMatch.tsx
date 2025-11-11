import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface CompanyInvestorMatchProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface CompanyInfo {
  id: string;
  name: string;
  industry?: string | null;
  geography?: string | string[] | null;
}

interface InvestorMatch {
  investorId: string;
  name: string;
  firmName?: string;
  email?: string;
  score: number;
  summary: string[];
}

const CompanyInvestorMatch: React.FC<CompanyInvestorMatchProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [matchResults, setMatchResults] = useState<InvestorMatch[]>([]);

  const companyIdFromUrl = useMemo(() => {
    const param = searchParams.get('companyId');
    if (param) return param;
    const fromStorage = sessionStorage.getItem('companyId');
    return fromStorage || null;
  }, [searchParams]);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setError('You must be signed in to view company matches.');
          setIsLoading(false);
          return;
        }

        const companyId = companyIdFromUrl;
        if (!companyId) {
          setError('Company information not found. Please open the matcher from your dashboard.');
          setIsLoading(false);
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('company-investor-match', {
          body: { companyId },
        });

        if (functionError) {
          console.error('Error invoking company-investor-match function:', functionError);
          setError(
            typeof functionError.message === 'string'
              ? functionError.message
              : 'Unable to load investor matches.'
          );
          setIsLoading(false);
          return;
        }

        if (!data) {
          setError('No data returned from match service.');
          setIsLoading(false);
          return;
        }

        setCompany(data.company ?? null);
        setMatchResults(Array.isArray(data.matches) ? data.matches : []);
      } catch (loadError) {
        console.error('Error loading company matches:', loadError);
        setError('Something went wrong while loading matches.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [companyIdFromUrl]);

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </button>
              <h1 className="text-lg font-semibold text-blue-500">Company Match Scores</h1>
            </div>
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Calculating company matches...</p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className={`p-6 rounded-lg border ${isDark ? 'bg-red-900/40 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}

        {!isLoading && !error && company && (
          <>
            <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg p-6 mb-8`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-blue-500 mb-1">{company.name}</h2>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    Investors best aligned with your company profile.
                  </p>
                </div>
                {company.industry && (
                  <div className={`flex items-center space-x-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span>{company.industry}</span>
                  </div>
                )}
              </div>
            </section>

            <section>
              {matchResults.length === 0 ? (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'} border rounded-lg p-10 text-center`}>
                  No companies available for matching yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {matchResults.map((match, index) => (
                    <div
                      key={match.investorId}
                      className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-sm p-6`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="text-xl font-semibold">
                                {match.name}
                              </h3>
                              {(match.firmName || match.email) && (
                                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {match.firmName && <span>{match.firmName}</span>}
                                  {match.email && <span className="ml-2">{match.email}</span>}
                                </div>
                              )}
                            </div>
                            <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm uppercase tracking-wide font-semibold text-gray-500">
                            Match Score
                          </div>
                          <div className="text-3xl font-bold text-green-500">
                            {match.score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      {match.summary.length > 0 && (
                        <ul className={`mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {match.summary.map((line, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CompanyInvestorMatch;

