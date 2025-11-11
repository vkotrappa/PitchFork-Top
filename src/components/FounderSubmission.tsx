import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save, Target, Globe, Users } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import SectorTree from './SectorTree';

interface FounderSubmissionProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface CompanyFormData {
  name: string;
  industry: string;
  description: string;
  funding_terms: string;
  address: string;
  country: string;
  contact_name: string;
  title: string;
  email: string;
  phone: string;
  revenue: string;
  valuation: string;
  url: string;
  geography: string | string[];
  ownership_leadership: string[];
  business_model: string[];
  industry_sectors: Array<{ sector: string; sub_sector: string }>;
}

const DEFAULT_FORM_DATA: CompanyFormData = {
  name: '',
  industry: '',
  description: '',
  funding_terms: '',
  address: '',
  country: 'US',
  contact_name: '',
  title: '',
  email: '',
  phone: '',
  revenue: '',
  valuation: '',
  url: '',
  geography: 'US',
  ownership_leadership: ['General'],
  business_model: [],
  industry_sectors: [],
};

const FounderSubmission: React.FC<FounderSubmissionProps> = ({ isDark, toggleTheme }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<Record<string, { name: string; description: string }>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      const { data: companyRecord } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (companyRecord) {
        setCompanyId(companyRecord.id);
        sessionStorage.setItem('companyId', companyRecord.id);
        setFormData((prev) => ({
          ...prev,
          name: companyRecord.name || '',
          industry: companyRecord.industry || '',
          description: companyRecord.description || '',
          funding_terms: companyRecord.funding_terms || '',
          address: companyRecord.address || '',
          country: companyRecord.country || 'US',
          contact_name:
            companyRecord.contact_name ||
            currentUser.user_metadata?.full_name ||
            `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim(),
          title: companyRecord.title || '',
          email: companyRecord.email || currentUser.email || '',
          phone:
            companyRecord.phone ||
            currentUser.user_metadata?.phone ||
            currentUser.user_metadata?.phone_number ||
            '',
          revenue: companyRecord.revenue || '',
          valuation: companyRecord.valuation || '',
          url: companyRecord.url || '',
          geography: companyRecord.geography || companyRecord.country || 'US',
          ownership_leadership: companyRecord.ownership_leadership || ['General'],
          business_model: companyRecord.business_model || [],
          industry_sectors: companyRecord.industry_sectors || [],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          contact_name:
            currentUser.user_metadata?.full_name ||
            `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim(),
          email: currentUser.email || '',
          phone:
            currentUser.user_metadata?.phone ||
            currentUser.user_metadata?.phone_number ||
            '',
        }));
      }
      setIsLoading(false);
    };

    initialize();
  }, [navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (group: 'ownership_leadership' | 'business_model', option: string) => {
    setFormData((prev) => {
      const current = new Set(prev[group]);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      return { ...prev, [group]: Array.from(current) };
    });
  };

  const handleAdditionalFiles = (files: FileList | File[]) => {
    const selected = Array.isArray(files) ? files : Array.from(files);
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.xls', '.xlsx'];
    const validFiles = selected.filter((file) => {
      const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
      return allowedExtensions.includes(extension);
    });

    if (validFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select PDF, PPT, PPTX, XLS, or XLSX files.' });
      return;
    }

    const existingNames = new Set(additionalFiles.map((file) => file.name));
    const uniqueFiles = validFiles.filter((file) => !existingNames.has(file.name));

    if (uniqueFiles.length === 0) {
      setMessage({ type: 'error', text: 'These files are already selected.' });
      return;
    }

    const updatedFiles = [...additionalFiles, ...uniqueFiles];
    setAdditionalFiles(updatedFiles);

    const metadata = { ...documentMetadata };
    uniqueFiles.forEach((file) => {
      metadata[file.name] = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
      };
    });
    setDocumentMetadata(metadata);

    setMessage(null);
  };

  const handleRemoveFile = (fileName: string) => {
    setAdditionalFiles((prev) => prev.filter((file) => file.name !== fileName));
    setDocumentMetadata((prev) => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  const handleMetadataChange = (
    fileName: string,
    field: 'name' | 'description',
    value: string
  ) => {
    setDocumentMetadata((prev) => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: value,
      },
    }));
  };

  const uploadAdditionalFiles = async (targetCompanyId: string) => {
    if (additionalFiles.length === 0) return;

    try {
      setIsUploadingFiles(true);
      const uploadPromises = additionalFiles.map(async (file) => {
        const filePath = `${targetCompanyId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('company-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const meta = documentMetadata[file.name] || {
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
        };

        const { error: insertError } = await supabase.from('documents').insert([
          {
            company_id: targetCompanyId,
            filename: file.name,
            document_name: meta.name,
            description: meta.description,
            path: filePath,
          },
        ]);

        if (insertError) {
          throw insertError;
        }
      });

      await Promise.all(uploadPromises);
      setMessage({ type: 'success', text: 'Files uploaded successfully.' });
      setAdditionalFiles([]);
      setDocumentMetadata({});
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage({ type: 'error', text: 'Failed to upload one or more files.' });
      throw error;
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Company name is required.' });
      return;
    }
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Primary email is required.' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      const payload = {
        name: formData.name.trim() || null,
        industry: formData.industry.trim() || null,
        description: formData.description.trim() || null,
        funding_terms: formData.funding_terms.trim() || null,
        address: formData.address.trim() || null,
        country: formData.country.trim() || null,
        contact_name: formData.contact_name.trim() || null,
        title: formData.title.trim() || null,
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        revenue: formData.revenue.trim() || null,
        valuation: formData.valuation.trim() || null,
        url: formData.url.trim() || null,
        geography: Array.isArray(formData.geography)
          ? formData.geography.filter(Boolean)
          : formData.geography
          ? [formData.geography]
          : [],
        ownership_leadership: formData.ownership_leadership?.length
          ? formData.ownership_leadership
          : ['General'],
        business_model: formData.business_model || [],
        industry_sectors: formData.industry_sectors || [],
      };

      if (companyId) {
        const { error } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert([{ ...payload, user_id: user.id }])
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data?.id) {
          setCompanyId(data.id);
          sessionStorage.setItem('companyId', data.id);
        }
      }

      const targetCompanyId = companyId || sessionStorage.getItem('companyId');
      if (targetCompanyId) {
        if (additionalFiles.length > 0) {
          await uploadAdditionalFiles(targetCompanyId);
        }
        setMessage({ type: 'success', text: 'Company saved. Let\'s match you with investors!' });
        setTimeout(() => {
          navigate('/investor-selection', { state: { companyId: targetCompanyId } });
        }, 800);
      }
    } catch (error) {
      console.error('Error saving company:', error);
      setMessage({ type: 'error', text: 'Failed to save company details. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading company details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img src="/pitch-fork3.png" alt="Pitch Fork Logo" className="w-8 h-8 mr-3" />
              <span className="text-2xl font-bold text-orange-500">Pitch Fork</span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`px-3 py-2 rounded-lg font-semibold ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">Create Your Company Profile</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            Tell us about your company. We'll use this information to match you with the right investors.
          </p>
        </header>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'bg-red-100 border-red-300 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-6`}>
            <h2 className="text-xl font-semibold mb-4">Primary Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contact Name *</label>
                <input
                  type="text"
                  name="contact_name"
                  required
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
          </section>

          <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-6`}>
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Company Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="DigitalAPI Corp."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Primary Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="FinTech, SaaS, Healthcare..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Website URL</label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Headquarters Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="US"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Company Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Briefly describe what your company does, the problem you solve, and your traction."
              />
            </div>
          </section>

          <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-6`}>
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Company/Investment Details</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-3">Industry Sectors & Sub-Sectors</label>
                <SectorTree
                  selectedSectors={formData.industry_sectors}
                  onChange={(selected) => setFormData((prev) => ({ ...prev, industry_sectors: selected }))}
                  isDark={isDark}
                  multiSelect
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Investment Terms</label>
                  <input
                    type="text"
                    name="funding_terms"
                    value={formData.funding_terms}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="e.g., Raising $3M Seed with SAFE @ $15M cap"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Geography</label>
                    <select
                      name="geography"
                      value={formData.geography}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      {['US', 'Europe', 'India'].map((geo) => (
                        <option key={geo} value={geo}>
                          {geo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Latest Annual Revenue / ARR</label>
                    <input
                      type="text"
                      name="revenue"
                      value={formData.revenue}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="$1.2M ARR"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Current Valuation</label>
                    <input
                      type="text"
                      name="valuation"
                      value={formData.valuation}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="$15M"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-orange-500" />
                      Business Model
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['B2B', 'B2C', 'Marketplace', 'Enterprise'].map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => handleCheckboxChange('business_model', option)}
                          className={`px-3 py-1.5 rounded-full text-sm border ${
                            formData.business_model.includes(option)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : isDark
                                ? 'bg-gray-700 border-gray-600 text-gray-200'
                                : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      Ownership / Leadership
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['General', 'Women', 'Minority', 'Veteran'].map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => handleCheckboxChange('ownership_leadership', option)}
                          className={`px-3 py-1.5 rounded-full text-sm border ${
                            formData.ownership_leadership.includes(option)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : isDark
                                ? 'bg-gray-700 border-gray-600 text-gray-200'
                                : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-6`}>
            <h2 className="text-xl font-semibold mb-4">Supporting Documents</h2>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Upload additional files (pitch deck, financials, etc.) to share with investors.
            </p>

            <div className={`p-4 border-2 border-dashed rounded-lg ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <span className="text-sm font-semibold text-orange-500 mb-1">Click to select files</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Accepted formats: PDF, PPT, PPTX, XLS, XLSX
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files && handleAdditionalFiles(e.target.files)}
                />
              </label>
            </div>

            {additionalFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                {additionalFiles.map((file) => (
                  <div
                    key={file.name}
                    className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg px-3 py-2 ${
                      isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{file.name}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={documentMetadata[file.name]?.name || ''}
                        onChange={(e) => handleMetadataChange(file.name, 'name', e.target.value)}
                        placeholder="Document name"
                        className={`flex-1 px-2 py-1 rounded border text-sm ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                      <input
                        type="text"
                        value={documentMetadata[file.name]?.description || ''}
                        onChange={(e) => handleMetadataChange(file.name, 'description', e.target.value)}
                        placeholder="Description"
                        className={`flex-1 px-2 py-1 rounded border text-sm ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || isUploadingFiles}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors shadow disabled:opacity-60"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving || isUploadingFiles ? 'Saving...' : companyId ? 'Update & Match Investors' : 'Save & Match Investors'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default FounderSubmission;