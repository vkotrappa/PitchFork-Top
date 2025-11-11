import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader, MapPin, Target } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface InvestorCompanyMatchProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export interface CompanyRecord {
  id: string;
  name: string;
  industry?: string;
  industry_sectors?: Array<{ sector: string; sub_sector?: string }>;
  revenue?: string;
  valuation?: string;
  country?: string;
  geography?: string | string[] | null;
  investment_round?: number;
  terms?: string;
  funding_terms?: string;
  ownership_leadership?: string[] | string | null;
  business_model?: string[] | string | null;
}

export interface InvestorDetailRecord {
  user_id: string;
  name: string;
  firm_name?: string;
  email?: string;
  industry_sectors?: Array<{ sector: string; sub_sector?: string }>;
  geography?: string[] | string | null;
  valuation_range?: string | null;
  minimum_arr?: number | null;
  sector_min_arr?: Array<{ sector: string; sub_sector?: string; min_arr?: number }>;
  ownership_leadership?: string[] | string | null;
  business_model?: string[] | string | null;
}

export interface MatchResult {
  investorId: string;
  name: string;
  firmName?: string;
  email?: string;
  score: number;
  summary: string[];
}

export const clampScore = (value: number) => Math.max(1, Math.min(10, Math.round(value * 10) / 10));

export const formatLabel = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const normalizeList = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(/[,;/|]/);
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => item.toLowerCase());
};

const parseAmount = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  let amount = parseFloat(match[1]);
  const lower = trimmed.toLowerCase();
  if (lower.includes('b')) {
    amount *= 1_000_000_000;
  } else if (lower.includes('m')) {
    amount *= 1_000_000;
  } else if (lower.includes('k')) {
    amount *= 1_000;
  }
  return isNaN(amount) ? null : amount;
};

const parseMoneyRange = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split(/to|-/i);
  if (parts.length >= 2) {
    const min = parseAmount(parts[0]);
    const max = parseAmount(parts[1]);
    if (min !== null || max !== null) {
      return {
        min: min ?? max ?? null,
        max: max ?? min ?? null,
      };
    }
  }
  const single = parseAmount(value);
  if (single !== null) {
    return { min: single, max: single };
  }
  return null;
};

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeGeography = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(/[,;/|]/);
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => {
      const lower = item.toLowerCase();
      if (['united states', 'usa', 'us'].includes(lower)) return 'us';
      if (['united kingdom', 'uk', 'britain', 'england'].includes(lower)) return 'uk';
      if (['canada', 'ca'].includes(lower)) return 'canada';
      if (['latin america', 'latam'].includes(lower)) return 'latam';
      if (['global', 'worldwide', 'any'].includes(lower)) return 'global';
      return lower;
    });
};

export const calculateMatchScore = (company: CompanyRecord, investor: InvestorDetailRecord): MatchResult => {
  let weightedTotal = 0;
  let weightSum = 0;
  const summary: string[] = [];

  const companySectorRecords = toArray(company.industry_sectors);
  const companySectorNames = companySectorRecords
    .map((s) => s?.sector?.trim())
    .filter(Boolean) as string[];
  const companySectors = companySectorNames.map((sector) => sector.toLowerCase());
  const companyIndustry = company.industry?.trim().toLowerCase();

  const investorSectorRecords = toArray(investor.industry_sectors);
  const investorSectorNames = investorSectorRecords
    .map((s) => s?.sector?.trim())
    .filter(Boolean) as string[];
  const investorSectors = investorSectorNames.map((sector) => sector.toLowerCase());

  const sectorWeight = 0.5;
  const revenueWeight = 0.3;
  const valuationWeight = 0.08;
  const geographyWeight = 0.05;
  const ownershipWeight = 0.035;
  const businessWeight = 0.035;

  const hasCompanySectorInfo = companySectors.length > 0 || Boolean(companyIndustry);
  let sectorMismatch = false;

  const overlappingSectors = investorSectorNames.filter((sector) => {
    const lower = sector.toLowerCase();
    return lower && (companySectors.includes(lower) || lower === companyIndustry);
  });

  if (investorSectors.length > 0) {
    if (overlappingSectors.length === 0) {
      sectorMismatch = true;
      summary.push('Sector fit: no overlap with investor focus');
    } else {
      weightedTotal += 10 * sectorWeight;
      weightSum += sectorWeight;
      summary.push(`Sector fit: aligned with ${overlappingSectors.map(formatLabel).join(', ')}`);
    }
  }

  if (!hasCompanySectorInfo) {
    sectorMismatch = true;
    summary.push('Sector fit: company did not provide sector data');
  }

  const companyRevenue = parseAmount(company.revenue);
  let investorMinArr = investor.minimum_arr ?? null;

  if (companySectors.length > 0 && investor.sector_min_arr?.length) {
    const sectorSpecific = investor.sector_min_arr.find((item) => {
      const sectorLower = item.sector?.toLowerCase();
      return sectorLower && companySectors.includes(sectorLower);
    });
    if (sectorSpecific?.min_arr !== undefined && sectorSpecific.min_arr !== null) {
      investorMinArr = sectorSpecific.min_arr;
    }
  }

  if (companyRevenue !== null && investorMinArr !== null) {
    const ratio = companyRevenue / investorMinArr;
    const score = clampScore(ratio >= 1 ? Math.min(10, 7 + (ratio - 1) * 3) : Math.max(2, ratio * 7));
    weightedTotal += score * revenueWeight;
    weightSum += revenueWeight;
    summary.push(
      ratio >= 1
        ? `Revenue meets minimum (≥ $${(investorMinArr / 1_000_000).toFixed(1)}M)`
        : `Revenue below target (needs ≥ $${(investorMinArr / 1_000_000).toFixed(1)}M)`
    );
  }
  if (companyRevenue === null && investorMinArr !== null) {
    weightedTotal += 5 * revenueWeight;
    weightSum += revenueWeight;
    summary.push('Revenue not provided by company');
  }

  const companyValuation = parseAmount(company.valuation);
  const valuationRange = parseMoneyRange(investor.valuation_range);
  if (companyValuation !== null && valuationRange) {
    const { min, max } = valuationRange;
    if (min !== null && max !== null) {
      let score: number;
      if (companyValuation >= min && companyValuation <= max) {
        score = 10;
        summary.push('Valuation within preferred range');
      } else {
        const distance =
          companyValuation < min ? min - companyValuation : companyValuation - max;
        const divisor = Math.max(max - min, min || max || 1);
        score = clampScore(Math.max(3, 10 - (distance / divisor) * 7));
        summary.push('Valuation slightly outside preferred range');
      }
      weightedTotal += score * valuationWeight;
      weightSum += valuationWeight;
    }
  }

  const companyGeos = normalizeGeography(company.geography ?? company.country);
  const investorGeos = normalizeGeography(investor.geography);

  if (investorGeos.length > 0) {
    if (companyGeos.length === 0) {
      weightedTotal += 5 * geographyWeight;
      weightSum += geographyWeight;
      summary.push('Geography preference not provided by company');
    } else {
      const geoMatch = companyGeos.some(
        (geo) => investorGeos.includes(geo) || investorGeos.includes('global')
      );
      weightedTotal += (geoMatch ? 10 : 2) * geographyWeight;
      weightSum += geographyWeight;
      summary.push(
        `Geography fit (${companyGeos.map(formatLabel).join(', ')})`
      );
    }
  }

  const companyOwnershipExplicit = normalizeList(company.ownership_leadership);
  const ownershipFromText = `${company.terms ?? ''} ${company.funding_terms ?? ''}`;
  const companyOwnershipTokens =
    companyOwnershipExplicit.length > 0
      ? companyOwnershipExplicit
      : ownershipFromText
          .split(/[,\s;/|]+/)
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean);

  const investorOwnership = normalizeList(investor.ownership_leadership);
  if (investorOwnership.length > 0) {
    const hasGeneral = investorOwnership.includes('general');
    const hasSpecific = investorOwnership.some((pref) => pref !== 'general');

    if (!hasSpecific && hasGeneral) {
      weightedTotal += 10 * ownershipWeight;
      weightSum += ownershipWeight;
      summary.push('Ownership: investor open to all (General preference)');
    } else if (companyOwnershipTokens.length === 0) {
      weightedTotal += (hasGeneral ? 8 : 4) * ownershipWeight;
      weightSum += ownershipWeight;
      summary.push('Ownership preference not provided by company');
    } else {
      const ownershipMatch = companyOwnershipTokens.some(
        (token) => hasGeneral || investorOwnership.includes(token)
      );
      weightedTotal += (ownershipMatch ? 10 : 3) * ownershipWeight;
      weightSum += ownershipWeight;
      summary.push(
        ownershipMatch
          ? 'Ownership preference aligned'
          : 'Ownership preference outside investor focus'
      );
    }
  }

  const companyBusinessModels = normalizeList(company.business_model);
  const investorBusinessModels = normalizeList(investor.business_model);
  if (investorBusinessModels.length > 0) {
    if (companyBusinessModels.length === 0) {
      weightedTotal += 5 * businessWeight;
      weightSum += businessWeight;
      summary.push('Business model not provided by company');
    } else {
      const matchedModel = companyBusinessModels.find((model) =>
        investorBusinessModels.includes(model)
      );
      weightedTotal += (matchedModel ? 10 : 3) * businessWeight;
      weightSum += businessWeight;
      summary.push(
        matchedModel
          ? `Business model aligned (${formatLabel(matchedModel)})`
          : 'Business model outside investor focus'
      );
    }
  }

  if (weightSum === 0) {
    return {
      investorId: investor.user_id,
      name: investor.name || 'Unnamed Investor',
      firmName: investor.firm_name || undefined,
      email: investor.email || undefined,
      score: 1,
      summary: ['Insufficient data to score'],
    };
  }

  const baseScore = clampScore(weightedTotal / weightSum);

  return {
    investorId: investor.user_id,
    name: investor.name || 'Unnamed Investor',
    firmName: investor.firm_name || undefined,
    email: investor.email || undefined,
    score: sectorMismatch ? clampScore(Math.min(baseScore, 3)) : baseScore,
    summary,
  };
};

const InvestorCompanyMatch: React.FC<InvestorCompanyMatchProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const companyIdFromUrl = useMemo(() => {
    const param = searchParams.get('companyId');
    if (param) return param;
    const fromStorage = sessionStorage.getItem('companyId');
    return fromStorage || null;
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setError('You must be signed in to view investor matches.');
          setIsLoading(false);
          return;
        }

        const companyId = companyIdFromUrl;
        if (!companyId) {
          setError('Company information not found. Please reopen the matcher from your dashboard.');
          setIsLoading(false);
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (companyError || !companyData) {
          setError('Unable to load company details.');
          setIsLoading(false);
          return;
        }

        setCompany(companyData);

        const { data: investorsData, error: investorsError } = await supabase
          .from('investor_details')
          .select('*');

        if (investorsError) {
          setError('Unable to load investor preferences.');
          setIsLoading(false);
          return;
        }

        const computedMatches = (investorsData || []).map((investor) =>
          calculateMatchScore(companyData, investor)
        );

        setMatches(
          computedMatches
            .sort((a, b) => b.score - a.score)
            .map((match) => ({
              ...match,
              summary: match.summary.filter(Boolean),
            }))
        );

        sessionStorage.setItem('companyId', companyId);
      } catch (loadError) {
        console.error('Error loading investor matches:', loadError);
        setError('Something went wrong while loading matches.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [companyIdFromUrl]);

  return (
    <div className={`min-h-screen font-inter transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/founder-dashboard')}
                className={`flex items-center px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </button>
              <h1 className="text-lg font-semibold text-orange-500">Investor Match Scores</h1>
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
              <Loader className="w-12 h-12 mx-auto mb-4 text-orange-500 animate-spin" />
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Calculating investor matches...</p>
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
                  <h2 className="text-2xl font-bold text-orange-500 mb-1">{company.name}</h2>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    Match results across the investor network based on your company profile.
                  </p>
                </div>
                <div className={`flex items-center space-x-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {company.industry && (
                    <span className="flex items-center space-x-1">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span>{company.industry}</span>
                    </span>
                  )}
                  {company.country && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>{company.country}</span>
                    </span>
                  )}
                  {company.revenue && (
                    <span className="flex items-center space-x-1">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <span>{company.revenue}</span>
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section>
              {matches.length === 0 ? (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'} border rounded-lg p-10 text-center`}>
                  No investor preference data available yet. Encourage investors to complete their profiles for matching.
                </div>
              ) : (
                <div className="space-y-6">
                  {matches.map((match, index) => (
                    <div
                      key={match.investorId}
                      className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-sm p-6`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-semibold">
                              {match.name}
                              {match.firmName && (
                                <span className={`ml-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {match.firmName}
                                </span>
                              )}
                            </h3>
                            <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                              #{index + 1}
                            </span>
                          </div>
                          {match.email && (
                            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {match.email}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-sm uppercase tracking-wide font-semibold text-gray-500">
                              Match Score
                            </div>
                            <div className="text-3xl font-bold text-green-500">
                              {match.score.toFixed(1)}
                            </div>
                          </div>
                          <div className="w-20 h-20 rounded-full border-8 border-green-500 flex items-center justify-center text-xl font-semibold text-green-500">
                            {match.score.toFixed(0)}/10
                          </div>
                        </div>
                      </div>
                      {match.summary.length > 0 && (
                        <ul className={`mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {match.summary.map((line, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="mt-1 w-2 h-2 rounded-full bg-orange-500" />
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

export default InvestorCompanyMatch;

