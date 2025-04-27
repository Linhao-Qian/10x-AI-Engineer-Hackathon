import type { Database } from '@/types/supabase';

type Talent = Database['public']['Tables']['talents']['Row'] & {
  score?: number;
};

export interface TalentMatchingParams {
  jobDescription: string;
  requiredSkills?: string[];
  location?: string;
  experienceLevel?: string;
  currency?: string;
  education?: string;
  jobTypes?: string[];
  desiredRoles?: string[];
  industries?: string[];
  remotePreference?: string;
  minYearsOfExperience?: number;
  maxYearsOfExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  isVerifiedOnly?: boolean;
  maxResults?: number;
}

export interface TalentMatchingResult {
  candidates: Talent[];
  analysis: string;
  metrics: {
    precision: number;
    ndcg: number;
  };
}

export class TalentMatchingService {
  private static instance: TalentMatchingService;

  private constructor() {}

  public static getInstance(): TalentMatchingService {
    if (!TalentMatchingService.instance) {
      TalentMatchingService.instance = new TalentMatchingService();
    }
    return TalentMatchingService.instance;
  }

  async findMatches(params: TalentMatchingParams): Promise<TalentMatchingResult> {
    const response = await fetch('/api/talent-matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        message: data.error,
        details: data.details,
        status: response.status
      };
    }

    return data;
  }
} 