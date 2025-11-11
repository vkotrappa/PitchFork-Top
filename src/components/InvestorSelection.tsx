import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, Building2, Target, Mail, BarChart3 } from 'lucide-react';
import {
  calculateMatchScore,
  CompanyRecord,
  InvestorDetailRecord,
  MatchResult,
  formatLabel,
} from './InvestorCompanyMatch';

type InvestorRecord = InvestorDetailRecord & {
  user_id: string;
  email?: string;
  firm_name?: string | null;
  focus_areas?: string | null;
  comment?: string | null;
};

interface InvestorMatch extends MatchResult {
  investor: InvestorRecord;
}

interface InvestorSelectionProps {
  companyId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function InvestorSelection({ companyId, onComplete, onCancel }: InvestorSelectionProps) {
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [investorMatches, setInvestorMatches] = useState<InvestorMatch[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [{ data: companyData, error: companyError }] = await Promise.all([
          supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
        ]);

        if (companyError || !companyData) {
          setMessage({ type: 'error', text: 'Unable to load company details.' });
          setIsLoading(false);
          return;
        }

        setCompany(companyData as CompanyRecord);

        const { data: investorData, error: investorError } = await supabase
          .from('investor_details')
          .select(
            'user_id, name, email, firm_name, focus_areas, comment, industry_sectors, geography, valuation_range, typical_check_size, ownership_leadership, minimum_arr, sector_min_arr, business_model'
          )
          .order('name');

        if (investorError) {
          throw investorError;
        }

        const matches = (investorData || []).map((record) => {
          const investorRecord = record as InvestorRecord;
          const result = calculateMatchScore(companyData as CompanyRecord, investorRecord);
          return {
            ...result,
            investor: investorRecord,
          };
        });

        setInvestorMatches(matches.sort((a, b) => b.score - a.score));
      } catch (error) {
        console.error('Error loading investors:', error);
        setMessage({ type: 'error', text: 'Failed to load investors' });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [companyId]);

  const toggleInvestor = (investorId: string) => {
    setSelectedInvestors((prev) => {
      const updated = new Set(prev);
      if (updated.has(investorId)) {
        updated.delete(investorId);
      } else {
        updated.add(investorId);
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (selectedInvestors.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one investor' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const selectedMatches = investorMatches.filter((match) =>
        selectedInvestors.has(match.investor.user_id)
      );

      const analysisEntries = selectedMatches.map((match) => ({
        company_id: companyId,
        investor_user_id: match.investor.user_id,
        status: 'screened',
        match_score: match.score,
        history: `${currentDate}: Screened (matched by founder)`,
      }));

      const { error: insertError } = await supabase
        .from('analysis')
        .insert(analysisEntries)
        .select();

      if (insertError) throw insertError;

      setMessage({
        type: 'success',
        text: `Submitted to ${selectedInvestors.size} investor${selectedInvestors.size > 1 ? 's' : ''}.`,
      });

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error submitting to investors:', error);
      setMessage({ type: 'error', text: 'Failed to submit to investors' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading investors...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Select Investors</h1>
            <p className="text-slate-600">
              Choose which investors you'd like to submit your company to for review.
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mb-8">
            <div className="text-sm text-slate-600 mb-4">
              {selectedInvestors.size} investor{selectedInvestors.size !== 1 ? 's' : ''} selected
            </div>

            <div className="space-y-4">
              {investorMatches.map((match) => (
                <div
                  key={match.investor.user_id}
                  onClick={() => !isSubmitting && toggleInvestor(match.investor.user_id)}
                  className={`border rounded-xl p-6 cursor-pointer transition-all ${
                    selectedInvestors.has(match.investor.user_id)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {selectedInvestors.has(match.investor.user_id) ? (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {match.investor.name}
                        </h3>
                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                          <BarChart3 className="w-4 h-4" />
                          <span>{match.score.toFixed(1)} / 10</span>
                        </div>
                      </div>

                      {match.investor.firm_name && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">{match.investor.firm_name}</span>
                        </div>
                      )}

                      {match.investor.focus_areas && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Target className="w-4 h-4" />
                          <span className="text-sm">{match.investor.focus_areas}</span>
                        </div>
                      )}

                      {match.investor.email && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{match.investor.email}</span>
                        </div>
                      )}

                      {match.summary.length > 0 && (
                        <ul className="mt-3 text-sm text-slate-600 space-y-1">
                          {match.summary.map((line, idx) => (
                            <li key={idx}>• {line}</li>
                          ))}
                        </ul>
                      )}

                      {match.investor.comment && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                          {match.investor.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedInvestors.size === 0}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : `Submit to ${selectedInvestors.size || 0} Investor${selectedInvestors.size !== 1 ? 's' : ''}`}
            </button>

            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
