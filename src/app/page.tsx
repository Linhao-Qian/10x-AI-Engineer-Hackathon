'use client';

import { useState } from 'react';
import { TalentMatchingService, type TalentMatchingParams, type TalentMatchingResult } from '@/services/talent-matching';
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

// First, let's create a reusable dropdown component at the top of the file
interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: CustomSelectOption[];
  className?: string;
}

const CustomSelect = ({ id, label, value, onChange, options, className = "" }: CustomSelectProps) => (
  <div className={`relative ${className}`}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-gray-300 shadow-sm pl-4 pr-8 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
      >
        <option value="">Select...</option>
        {options.map((option: CustomSelectOption) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </div>
    </div>
  </div>
);

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<Omit<TalentMatchingParams, 'jobDescription'>>({
    requiredSkills: [],
    maxResults: 10
  });
  const [result, setResult] = useState<TalentMatchingResult | null>(null);
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});

  // Add these experience level options
  const experienceLevelOptions: CustomSelectOption[] = [
    { value: "junior", label: "Junior" },
    { value: "mid", label: "Mid" },
    { value: "senior", label: "Senior" },
    { value: "lead", label: "Lead" },
    { value: "principal", label: "Principal" },
  ];

  const currencyOptions: CustomSelectOption[] = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "AED", label: "AED" },
    { value: "BRL", label: "BRL" },
  ];

  const educationOptions: CustomSelectOption[] = [
    { value: "B.S.", label: "Bachelor's Degree" },
    { value: "M.S.", label: "Master's Degree" },
    { value: "Ph.D.", label: "Ph.D." }
  ].map(option => ({
    ...option,
    value: option.value + " ",  // Add space to ensure we match "B.S. " in "B.S. Computer Science"
  }));

  const remotePreferenceOptions: CustomSelectOption[] = [
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "On-site" },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotification([]);
    // Reset feedback when starting a new search
    setFeedback({});

    try {
      console.log('Starting search with params:', { jobDescription, ...filters });
      const service = TalentMatchingService.getInstance();
      const matches = await service.findMatches({
        jobDescription,
        ...filters
      });
      console.log('Search results:', matches);
      setResult(matches);
    } catch (error: unknown) {
      console.error('Error finding matches:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as any).status === 400 &&
        'details' in error
      ) {
        setNotification((error as any).details);
      } else {
        setError((error as Error).message || 'An unexpected error occurred');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics based on feedback
  const calculateMetrics = (candidates: TalentMatchingResult["candidates"], feedback: Record<string, boolean>) => {
    const labeledCandidates = Object.keys(feedback).length;
    
    if (labeledCandidates === 0) {
      return { precision: null, ndcg: null };
    }

    // Calculate Precision@N based on feedback
    const relevantCount = Object.values(feedback).filter(isRelevant => isRelevant).length;
    const precision = relevantCount / labeledCandidates;

    // Calculate NDCG based on feedback
    const idealDCG = Object.values(feedback)
      .sort((a, b) => (b ? 1 : 0) - (a ? 1 : 0))
      .reduce((acc, isRelevant, i) => acc + (isRelevant ? 1 : 0) / Math.log2(i + 2), 0);

    const actualDCG = candidates
      .reduce((acc, candidate, i) => {
        const isRelevant = feedback[candidate.id];
        // Only include in calculation if we have feedback
        if (isRelevant !== undefined) {
          return acc + (isRelevant ? 1 : 0) / Math.log2(i + 2);
        }
        return acc;
      }, 0);

    const ndcg = idealDCG > 0 ? actualDCG / idealDCG : 0;

    // Return raw values, not multiplied or rounded
    return { 
      precision,
      ndcg
    };
  };

  // Handle feedback submission
  const handleFeedback = (candidateId: string, isRelevant: boolean) => {
    setFeedback(prev => ({
      ...prev,
      [candidateId]: isRelevant
    }));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Linhao Qian&apos;s AI-Powered Talent Matching System
          </h1>
          <p className="text-lg text-gray-600">
            Find the perfect candidates for your job using advanced AI matching
          </p>
        </div>

        <div className="space-y-8">
          {/* Search Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Show validation notification */}
              {notification.length > 0 && (
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-blue-800">Please Note</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc pl-5 space-y-1">
                          {notification.map((msg, index) => (
                            <li key={index}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show actual errors */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="jobDescription"
                    rows={6}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter detailed job description..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />
                </div>

                {/* First Row of Basic Filters */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                      Required Skills (comma-separated) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="skills"
                      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Python, React, AWS"
                      onChange={(e) => setFilters({
                        ...filters,
                        requiredSkills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Tokyo, Japan"
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    />
                  </div>
                </div>

                {/* Second Row with Experience Level and Advanced Filters */}
                <div className="md:col-span-2 flex items-end justify-between mt-2">
                  <CustomSelect
                    id="experienceLevel"
                    label="Experience Level"
                    value={filters.experienceLevel || ""}
                    onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                    options={experienceLevelOptions}
                    className="w-40"
                  />

                  <div className="flex flex-col items-end gap-2">
                    {/* Advanced Filters Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors duration-150 whitespace-nowrap h-10"
                    >
                      <span className="mr-2">Advanced Filters</span>
                      {showAdvancedFilters ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <>
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2"></div>
                    
                    {/* Years of Experience Range */}
                    <div>
                      <label htmlFor="minYearsOfExperience" className="block text-sm font-medium text-gray-700 mb-2">
                        Min Experience (Years)
                      </label>
                      <input
                        type="number"
                        id="minYearsOfExperience"
                        min="0"
                        className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setFilters({ ...filters, minYearsOfExperience: parseInt(e.target.value) || undefined })}
                      />
                    </div>

                    <div>
                      <label htmlFor="maxYearsOfExperience" className="block text-sm font-medium text-gray-700 mb-2">
                        Max Experience (Years)
                      </label>
                      <input
                        type="number"
                        id="maxYearsOfExperience"
                        min="0"
                        className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setFilters({ ...filters, maxYearsOfExperience: parseInt(e.target.value) || undefined })}
                      />
                    </div>

                    {/* Job Types */}
                    <div>
                      <label htmlFor="jobTypes" className="block text-sm font-medium text-gray-700 mb-2">
                        Job Types (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="jobTypes"
                        className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., full-time, remote, contract"
                        onChange={(e) => setFilters({
                          ...filters,
                          jobTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                    </div>

                    {/* Desired Roles */}
                    <div>
                      <label htmlFor="desiredRoles" className="block text-sm font-medium text-gray-700 mb-2">
                        Desired Roles (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="desiredRoles"
                        className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Software Engineer, Tech Lead"
                        onChange={(e) => setFilters({
                          ...filters,
                          desiredRoles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                    </div>

                    {/* Industries */}
                    <div>
                      <label htmlFor="industries" className="block text-sm font-medium text-gray-700 mb-2">
                        Industries (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="industries"
                        className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Technology, Finance, Healthcare"
                        onChange={(e) => setFilters({
                          ...filters,
                          industries: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                    </div>

                    {/* Remote Preference */}
                    <div>
                      <CustomSelect
                        id="remotePreference"
                        label="Remote Preference"
                        value={filters.remotePreference || ""}
                        onChange={(e) => setFilters({ ...filters, remotePreference: e.target.value })}
                        options={remotePreferenceOptions}
                      />
                    </div>

                    {/* Salary Range */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary Expectation Range
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <input
                          type="number"
                          id="minSalary"
                          placeholder="Min Salary"
                          min="0"
                          className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            setFilters({ ...filters, minSalary: value });
                          }}
                        />
                        <input
                          type="number"
                          id="maxSalary"
                          placeholder="Max Salary"
                          min="0"
                          className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            setFilters({ ...filters, maxSalary: value });
                          }}
                        />
                        <CustomSelect
                          id="currency"
                          value={filters.currency || ""}
                          onChange={(e) => setFilters({ ...filters, currency: e.target.value || undefined })}
                          options={currencyOptions}
                        />
                      </div>
                    </div>

                    {/* Education Level and Verified Profiles in same row */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 items-start">
                      <div>
                        <CustomSelect
                          id="education"
                          label="Education Level"
                          value={filters.education || ""}
                          onChange={(e) => setFilters({ ...filters, education: e.target.value })}
                          options={educationOptions}
                        />
                      </div>

                      {/* Verified Only */}
                      <div className="flex justify-end items-end h-full">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isVerifiedOnly"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            onChange={(e) => setFilters({ ...filters, isVerifiedOnly: e.target.checked })}
                          />
                          <label htmlFor="isVerifiedOnly" className="ml-2 text-sm text-gray-700 whitespace-nowrap">
                            Show only verified profiles
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !jobDescription || !filters.requiredSkills?.length}
                  className="flex items-center justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Finding matches...
                    </>
                  ) : (
                    <>
                      <Search className="-ml-1 mr-2 h-4 w-4" />
                      Find Matches
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Results Panel */}
          <div>
            {result && result.candidates && (
              <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Matching Results
                  </h2>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex space-x-4">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">
                          Precision@{Object.keys(feedback).length || result?.candidates?.length || 0}:
                        </span>{' '}
                        {feedback && result?.candidates && result.candidates.length > 0 && Object.keys(feedback).length > 0
                          ? `${(calculateMetrics(result.candidates, feedback).precision !== null ? ((calculateMetrics(result.candidates, feedback).precision || 0) * 100).toFixed(2) : 'N/A')}%`
                          : 'Awaiting feedback'}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">
                          NDCG:
                        </span>{' '}
                        {feedback && result?.candidates && result.candidates.length > 0 && Object.keys(feedback).length > 0
                          ? `${(calculateMetrics(result.candidates, feedback).ndcg !== null ? ((calculateMetrics(result.candidates, feedback).ndcg || 0) * 100).toFixed(2) : 'N/A')}%`
                          : 'Awaiting feedback'}
                      </div>
                    </div>
                  </div>

                  {result.analysis && (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis</h3>
                      <p className="text-gray-600 whitespace-pre-line">{result.analysis}</p>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-gray-200">
                  {result.candidates.map((candidate) => (
                    <div key={candidate.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {candidate.full_name}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {((candidate.score || 0) * 100).toFixed(1)}% Match
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {candidate.seniority_level}
                          </span>
                        </div>

                        {/* Feedback Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFeedback(candidate.id, true)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                              ${feedback[candidate.id] === true 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                          >
                            Relevant
                          </button>
                          <button
                            onClick={() => handleFeedback(candidate.id, false)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                              ${feedback[candidate.id] === false 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                          >
                            Not Relevant
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-gray-600">{candidate.headline}</p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Location</dt>
                          <dd className="mt-1 text-sm text-gray-900">{candidate.location}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Experience</dt>
                          <dd className="mt-1 text-sm text-gray-900">{candidate.years_of_experience} years</dd>
                        </div>
                      </div>

                      <div className="mt-4">
                        <dt className="text-sm font-medium text-gray-500">Skills</dt>
                        <dd className="mt-1">
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills?.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>

                      {candidate.linkedin_url && (
                        <div className="mt-4">
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-500"
                          >
                            View LinkedIn Profile
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                Enter the job description and required skills, then click &quot;Find Matches&quot; to see results.
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" />
                <p className="mt-2 text-gray-600">Finding the best matches...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
