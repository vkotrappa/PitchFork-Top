import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, Building2, Target, Mail } from 'lucide-react';

interface Investor {
  user_id: string;
  name: string;
  email: string;
  firm_name: string | null;
  focus_areas: string | null;
  comment: string | null;
}

interface InvestorSelectionProps {
  companyId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function InvestorSelection({ companyId, onComplete, onCancel }: InvestorSelectionProps) {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    loadInvestors();
    loadCompanyName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadInvestors = async () => {
    try {
      // Get all investor details - includes name, email, firm info
      const { data: investorData, error: investorError } = await supabase
        .from('investor_details')
        .select('user_id, name, email, firm_name, focus_areas, comment')
        .order('name');

      if (investorError) throw investorError;

      setInvestors(investorData || []);
    } catch (error) {
      console.error('Error loading investors:', error);
      setMessage({ type: 'error', text: 'Failed to load investors' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyName = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      setCompanyName(data?.name || '');
    } catch (error) {
      console.error('Error loading company name:', error);
    }
  };

  const toggleInvestor = (investorId: string) => {
    const newSelected = new Set(selectedInvestors);
    if (newSelected.has(investorId)) {
      newSelected.delete(investorId);
    } else {
      newSelected.add(investorId);
    }
    setSelectedInvestors(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedInvestors.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one investor' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Step 1: Create analysis entries with 'submitted' status
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const analysisEntries = Array.from(selectedInvestors).map(investorUserId => ({
        company_id: companyId,
        investor_user_id: investorUserId,
        status: 'submitted',
        history: `${currentDate}: Submitted`
      }));

      const { data: insertedAnalysis, error: insertError } = await supabase
        .from('analysis')
        .insert(analysisEntries)
        .select();

      if (insertError) throw insertError;

      setMessage({
        type: 'success',
        text: `Submitted to ${selectedInvestors.size} investor${selectedInvestors.size > 1 ? 's' : ''}. Running AI screening...`
      });

      // Step 2: Run AI screening for each investor
      const screeningPromises = insertedAnalysis.map(async (analysis) => {
        try {
          const response = await supabase.functions.invoke('screen-investor-match', {
            body: {
              company_id: companyId,
              investor_user_id: analysis.investor_user_id,
              analysis_id: analysis.id
            }
          });

          if (response.error) {
            console.error(`Screening failed for investor ${analysis.investor_user_id}:`, response.error);
          } else {
            console.log(`Screening completed for investor ${analysis.investor_user_id}:`, response.data);
          }
        } catch (error) {
          console.error(`Error screening investor ${analysis.investor_user_id}:`, error);
          // Don't throw - continue with other investors
        }
      });

      // Wait for all screening to complete (or fail)
      await Promise.allSettled(screeningPromises);

      // Send email notification to admin
      try {
        const selectedInvestorNames = investors
          .filter(investor => selectedInvestors.has(investor.user_id))
          .map(investor => investor.name)
          .join(', ');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsimmsznrutwgtkkblgw.supabase.co';
        const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.error('No valid session for email notification:', sessionError);
        } else {
          const emailResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              toEmail: 'vkotrappa@gmail.com',
              toName: 'Admin',
              subject: 'Pitchdeck Submitted',
              body: `Thank you for submitting your pitchdeck. It was sent to: ${selectedInvestorNames}. We will get back to you when they evaluate and decide.

Best regards,
Admin@PitchFork.com`,
              senderName: 'Admin@PitchFork.com',
              companyName: companyName || 'Pitch Deck Submission',
              messageType: 'admin'
            })
          });

          if (!emailResponse.ok) {
            console.error('Failed to send admin email notification:', await emailResponse.text());
          } else {
            console.log('Admin email notification sent successfully');
          }
        }
      } catch (emailError) {
        console.error('Error sending admin email notification:', emailError);
        // Don't fail the whole operation if email fails
      }

      setMessage({
        type: 'success',
        text: `AI screening complete! Submitted to ${selectedInvestors.size} investor${selectedInvestors.size > 1 ? 's' : ''}`
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
              {investors.map((investor) => (
                <div
                  key={investor.user_id}
                  onClick={() => !isSubmitting && toggleInvestor(investor.user_id)}
                  className={`border rounded-xl p-6 cursor-pointer transition-all ${
                    selectedInvestors.has(investor.user_id)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {selectedInvestors.has(investor.user_id) ? (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {investor.name}
                      </h3>

                      {investor.firm_name && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">{investor.firm_name}</span>
                        </div>
                      )}

                      {investor.focus_areas && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Target className="w-4 h-4" />
                          <span className="text-sm">{investor.focus_areas}</span>
                        </div>
                      )}

                      {investor.email && (
                        <div className="flex items-center gap-2 text-slate-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{investor.email}</span>
                        </div>
                      )}

                      {investor.comment && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                          {investor.comment}
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
