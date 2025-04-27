import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

interface Talent {
  id: string;
  full_name: string;
  location?: string;
  seniority_level?: string;
  education?: Array<{
    year: number;
    degree: string;
    school: string;
  }>;
  salary_expectation_range?: import("@/types/supabase").Json | null;
  profile_strength?: number;
  score?: number;
  job_types?: string[];
  desired_roles?: string[];
  industries?: string[];
  remote_preference?: string;
  years_of_experience?: number;
  is_verified?: boolean;
  summary?: string;
  headline?: string;
  current_title?: string;
  skills?: string[];
}

// Base ranking function that uses profile strength
function rankByProfileStrength(candidates: Talent[]): Talent[] {
  return candidates.map(candidate => ({
    ...candidate,
    score: candidate.profile_strength || 0.5
  })).sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (normA * normB);
}

// Main ranking function that handles both AI and fallback cases
async function rankCandidates(jobDescription: string, candidates: Talent[]): Promise<Talent[]> {
  try {
    // Create job description embedding
    const jobProfileText = jobDescription;
    const jobEmbedding = await cohere.embed({
      texts: [jobProfileText],
      model: 'embed-english-v3.0',
      inputType: 'search_query'
    });

    // Create candidate embeddings
    const candidateTexts = candidates.map(candidate => {
      const parts = [
        candidate.headline,
        candidate.summary,
        candidate.current_title,
        candidate.skills?.join(', '),
      ].filter(Boolean);
      return parts.join(' ');
    });

    const candidateEmbeddings = await cohere.embed({
      texts: candidateTexts,
      model: 'embed-english-v3.0',
      inputType: 'search_document'
    });

    // Calculate similarity scores
    const jobVector = Array.isArray(jobEmbedding.embeddings) 
      ? jobEmbedding.embeddings[0] 
      : Object.values(jobEmbedding.embeddings)[0];

    return candidates.map((candidate, index) => {
      const candidateVector = Array.isArray(candidateEmbeddings.embeddings)
        ? candidateEmbeddings.embeddings[index]
        : Object.values(candidateEmbeddings.embeddings)[index];
      
      const similarity = cosineSimilarity(jobVector, candidateVector);
      return {
        ...candidate,
        score: similarity
      };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch (error) {
    console.error('Error in AI ranking:', error);
    return rankByProfileStrength(candidates);
  }
}

export async function POST(request: Request) {
  try {
    const { 
      jobDescription,
      requiredSkills, 
      location, 
      experienceLevel, 
      currency, 
      education,
      jobTypes,
      desiredRoles,
      industries,
      remotePreference,
      minYearsOfExperience,
      maxYearsOfExperience,
      minSalary,
      maxSalary,
      isVerifiedOnly
    } = await request.json();

    // First, get candidates matching required skills and other filters
    let query = supabase
      .from('talents')
      .select('*')
      .contains('skills', requiredSkills); // Required skills filter is mandatory

    // Apply other filters conditionally
    if (isVerifiedOnly) {
      query = query.eq('is_verified', true);
    }
    
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    
    if (experienceLevel) {
      query = query.eq('seniority_level', experienceLevel);
    }
    
    if (minYearsOfExperience !== undefined) {
      query = query.gte('years_of_experience', minYearsOfExperience);
    }
    
    if (maxYearsOfExperience !== undefined) {
      query = query.lte('years_of_experience', maxYearsOfExperience);
    }
    
    if (minSalary !== undefined) {
      query = query.gte('salary_expectation_range->>min', minSalary);
    }
    
    if (maxSalary !== undefined) {
      query = query.lte('salary_expectation_range->>max', maxSalary);
    }
    
    if (currency) {
      query = query.eq('salary_expectation_range->>currency', currency);
    }

    const { data: talents, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    if (!talents || talents.length === 0) {
      return NextResponse.json({
        candidates: [],
        metrics: { precision: 0, ndcg: 0 },
        analysis: "No candidates found with the required skills and specified criteria."
      });
    }

    // Apply array-based filters that can't be done in the query
    let filteredTalents = talents as Talent[];

    if (jobTypes?.length > 0) {
      filteredTalents = filteredTalents.filter(talent =>
        talent.job_types?.some(type => jobTypes.includes(type))
      );
    }

    if (desiredRoles?.length > 0) {
      filteredTalents = filteredTalents.filter(talent =>
        talent.desired_roles?.some(role => desiredRoles.includes(role))
      );
    }

    if (industries?.length > 0) {
      filteredTalents = filteredTalents.filter(talent =>
        talent.industries?.some(industry => industries.includes(industry))
      );
    }

    if (remotePreference) {
      filteredTalents = filteredTalents.filter(talent =>
        talent.remote_preference === remotePreference
      );
    }

    if (education) {
      filteredTalents = filteredTalents.filter(talent => 
        talent.education?.some((edu: { degree: string }) => 
          edu.degree.startsWith(education)
        )
      );
    }

    if (filteredTalents.length === 0) {
      return NextResponse.json({
        candidates: [],
        metrics: { precision: 0, ndcg: 0 },
        analysis: "Found candidates with required skills, but none match the additional filter criteria."
      });
    }

    // Now rank the filtered candidates using semantic search
    const rankedCandidates = await rankCandidates(jobDescription, filteredTalents);

    // Calculate metrics
    const totalCandidates = rankedCandidates.length;
    const relevantCandidates = rankedCandidates.filter(c => (c.score || 0) > 0.7).length;
    const precision = totalCandidates > 0 ? relevantCandidates / totalCandidates : 0;

    // Calculate NDCG
    const idealDCG = rankedCandidates
      .map(c => c.score || 0)
      .sort((a, b) => b - a)
      .reduce((acc, score, i) => acc + score / Math.log2(i + 2), 0);

    const actualDCG = rankedCandidates
      .reduce((acc, candidate, i) => acc + (candidate.score || 0) / Math.log2(i + 2), 0);

    const ndcg = idealDCG > 0 ? actualDCG / idealDCG : 0;

    // Generate analysis
    let analysis = `Found ${totalCandidates} candidates with the required skills and matching your criteria.\n`;
    if (totalCandidates > 0) {
      analysis += `${relevantCandidates} candidates show strong relevance to the job description.\n`;
      if (relevantCandidates > 0) {
        analysis += `Top candidates are ranked based on their match with your job description.`;
      }
    }

    return NextResponse.json({
      candidates: rankedCandidates,
      metrics: {
        precision,
        ndcg
      },
      analysis
    });
  } catch (error) {
    console.error('Error in talent matching:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 