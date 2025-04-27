# Linhao Qian's 10x AI Engineer Hackathon Project

## Overview

This project is a full-stack, AI-powered talent-matching platform built for the "10x AI Engineer Hackathon". It leverages Next.js for the web app, Supabase for the database, and Cohere's embed-english-v3.0 model for semantic job-candidate matching. The project was developed using advanced AI tools: **Cursor** and **Claude 3.7**.

---

## Project Structure

```
10x-ai-engineer-hackathon/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── talent-matching/route.ts   # Main API route for matching
│   │   └── page.tsx                       # Main frontend page
│   ├── lib/
│   ├── services/
│   │   └── talent-matching.ts             # Frontend API service
│   └── types/
│       └── supabase.ts                    # Supabase schema types
├── public/
├── .env.local                             # Environment variables (Supabase, Cohere)
├── package.json
└── README.md
```

---

## Technical Decisions & Rationale

- **API Design:**
  - Single `/api/talent-matching` endpoint for simplicity and composability.
- **Frontend UX:**
  - Live feedback and metrics for iterative improvement.
- **TypeScript Types:**
  - Ensures type safety and alignment with database schema.
- **Supabase Schema:**
  - Postgres foundation, real-time, easy Next.js integration.
  - JSONB/array fields for flexibility and future-proofing.
- **AI-Driven Data Generation:**
  - Used AI to synthesize realistic, diverse talent data for development and demo.
- **Cohere Embeddings:**
  - Chosen for state-of-the-art semantic search and robust API.
  - Enables matching on meaning, not just keywords.
- **Evaluation Metrics:**
  - Precision@N and NDCG provide quantitative feedback on matching quality.

---

## API Route: Filtering, Ranking, and Metrics

**Filtering:**
- Uses Supabase's `.contains`, `.eq`, `.ilike`, and JSON operators for efficient server-side filtering.
- Applies additional array-based filters in TypeScript for complex fields.

**Ranking:**
- If Cohere is available, uses semantic similarity. If not, falls back to `profile_strength`.

**Metrics:**
- Computes Precision@N and NDCG (Normalized Discounted Cumulative Gain) for result quality.

**Key Code Snippet:**
```ts
// src/app/api/talent-matching/route.ts
export async function POST(request: Request) {
  // ...parse filters from request
  let query = supabase.from('talents').select('*').contains('skills', requiredSkills);
  // ...apply more filters
  const { data: talents } = await query;
  // ...array-based filters
  const rankedCandidates = await rankCandidates(jobDescription, filteredTalents);
  // Metrics
  const precision = ...; // see code for details
  const ndcg = ...;
  return NextResponse.json({ candidates: rankedCandidates, metrics: { precision, ndcg }, analysis });
}
```

---

## Frontend: User Experience & Live Metrics

- Built with Next.js App Router and React.
- Users enter job description and filters, then see ranked results with match scores.
- Users can provide feedback (relevant/not relevant), and see live-updating Precision@N and NDCG metrics.

**Key Code Snippet:**
```tsx
// src/app/page.tsx
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  const service = TalentMatchingService.getInstance();
  const matches = await service.findMatches({ jobDescription, ...filters });
  setResult(matches);
  setLoading(false);
};
```

---

## Supabase Schema: Flexible, AI-Friendly Design

**Schema & Data Synthesis with Supabase MCP and Cursor:**
- The talents table was designed and generated using Supabase's Model Context Protocol (MCP) directly within Cursor. This allowed for rapid schema prototyping, instant migrations, and seamless integration with the rest of the stack.
- AI (Cursor + Claude 3.7) was used to iteratively refine the schema, ensuring it captured all relevant aspects of a talent profile for real-world matching scenarios.
- Using Cursor's AI capabilities, I synthesized a diverse and realistic dataset for the talents table, covering a wide range of skills, locations, seniority levels, salary expectations, and more. This enabled robust development and demoing without manual data entry.

**Column Choices & Rationale:**
- `skills` (string[]): Array type allows each talent to have multiple skills, supporting flexible filtering and matching.
- `education` (Json[]): JSONB array supports complex, nested education histories (degree, year, school), making the schema future-proof for richer data.
- `salary_expectation_range` (Json): JSONB object stores min, max, and currency, allowing for nuanced salary filtering and internationalization.
- `profile_strength` (number): Quantifies the completeness and quality of a profile, used as a fallback ranking metric if semantic search is unavailable.
- `is_verified` (boolean): Indicates whether a profile has been verified, supporting trust and quality filters.
- `desired_roles`, `job_types`, `industries` (string[]): Arrays allow talents to express multiple preferences, enabling more accurate and flexible matching.
- `remote_preference` (string): Captures remote/hybrid/onsite preferences, which are critical in modern job markets.
- `years_of_experience`, `seniority_level`: Key for filtering and ranking by experience.
- `headline`, `summary`, `current_title`: Used for both display and as input to semantic embedding for matching.

**Why this schema?**
- Arrays and JSONB fields provide flexibility for evolving requirements and richer data.
- The schema supports both structured filtering (SQL/JSONB queries) and unstructured, semantic search (via Cohere embeddings).
- Designed to balance extensibility, query performance, and real-world expressiveness for talent data.

**Key Schema (TypeScript):**
```ts
// src/types/supabase.ts
export interface Database {
  public: {
    Tables: {
      talents: {
        Row: {
          id: string;
          full_name: string;
          location: string | null;
          headline: string | null;
          summary: string | null;
          years_of_experience: number | null;
          current_title: string | null;
          skills: string[] | null;
          industries: string[] | null;
          seniority_level: string | null;
          education: Json[] | null;
          job_types: string[] | null;
          desired_roles: string[] | null;
          salary_expectation_range: Json | null;
          profile_strength: number | null;
          is_verified: boolean | null;
          // ...more fields
        }
      }
    }
  }
}
```

---

## How Matching Works: End-to-End Flow

1. **User enters a job description and filter criteria** in the web UI.
2. **Frontend** sends a POST request to `/api/talent-matching` with the job description and filters.
3. **API route**:
   - **Filtering mechanism:**  
     The API first retrieves talents from Supabase using structured filters (skills, location, experience level, salary range, education, job types, etc.).  
     - Most filters (like required skills, location, years of experience, salary, and verification status) are applied directly in the Supabase SQL query for efficiency.
     - More complex or array-based filters (like job types, desired roles, industries, education) are applied in TypeScript after the initial query.
     - This ensures only relevant candidates are considered for ranking, improving both performance and result quality.
   - **Ranking mechanism:**  
     After filtering, the remaining candidates are ranked using semantic similarity:
     - The job description and each candidate's profile are embedded using Cohere's model.
     - Cosine similarity is computed between the job and each candidate embedding.
     - Candidates are sorted by similarity score (or by profile strength if semantic ranking fails).
   - The API returns the ranked candidates and evaluation metrics (precision, NDCG).
4. **Frontend** displays results, allows user feedback, and computes live metrics.

---

## Cohere Embeddings for Semantic Matching

**Why Cohere?**
- Traditional keyword or boolean search is brittle for talent matching. Cohere's large language model embeddings allow for deep, semantic comparison between job descriptions and candidate profiles.

**How it works:**
- The job description is embedded using Cohere's `embed-english-v3.0` model.
- Each candidate's profile (headline, summary, title, skills) is embedded as a document.
- Cosine similarity is computed between the job and each candidate.
- Candidates are ranked by similarity score.

**Key Code Snippet:**
```ts
// src/app/api/talent-matching/route.ts
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY || '' });

// ...
async function rankCandidates(jobDescription: string, candidates: Talent[]): Promise<Talent[]> {
  // 1. Embed job description
  const jobEmbedding = await cohere.embed({
    texts: [jobDescription],
    model: 'embed-english-v3.0',
    inputType: 'search_query'
  });

  // 2. Embed candidate profiles
  const candidateTexts = candidates.map(c => [c.headline, c.summary, c.current_title, c.skills?.join(', ')].filter(Boolean).join(' '));
  const candidateEmbeddings = await cohere.embed({
    texts: candidateTexts,
    model: 'embed-english-v3.0',
    inputType: 'search_document'
  });

  // 3. Cosine similarity
  function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((acc, v, i) => acc + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
    const normB = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
    return dot / (normA * normB);
  }
  const jobVector = jobEmbedding.embeddings[0];
  return candidates.map((candidate, i) => ({
    ...candidate,
    score: cosineSimilarity(jobVector, candidateEmbeddings.embeddings[i])
  })).sort((a, b) => (b.score || 0) - (a.score || 0));
}
```

## Evaluation Metrics: Precision & NDCG

To assess the quality of talent matching, the system computes two key evaluation metrics:

### Precision@N
- **Definition:** The proportion of the top-N returned candidates that are relevant to the job description.
- **Backend:** Precision is calculated as the fraction of candidates with a similarity score above a threshold (e.g., 0.7) among all returned candidates.
- **Frontend:** Precision@N is dynamically updated based on user feedback (marking candidates as "Relevant" or "Not Relevant").

### NDCG (Normalized Discounted Cumulative Gain)
- **Definition:** Measures the ranking quality by considering the position of relevant candidates in the result list. Higher NDCG means more relevant candidates appear near the top.
- **Backend:** NDCG is computed using the similarity scores of the ranked candidates.
- **Frontend:** NDCG is recalculated live as users provide feedback, reflecting the quality of the current ranking.

### Adjusting the Metrics

- **User Feedback:** Users can mark each candidate as "Relevant" or "Not Relevant" in the UI. The metrics update in real time to reflect this feedback.
- **Result Count:** Users can adjust the number of results (N) via the search filters, which changes the scope of Precision@N and NDCG.
- **Thresholds:** Developers can modify the similarity score threshold for relevance in the backend code (see `src/app/api/talent-matching/route.ts`).

**Example Code (Frontend Calculation):**
```tsx
// src/app/page.tsx
const calculateMetrics = (candidates, feedback) => {
  const labeledCandidates = Object.keys(feedback).length;
  if (labeledCandidates === 0) return { precision: null, ndcg: null };
  const relevantCount = Object.values(feedback).filter(isRelevant => isRelevant).length;
  const precision = relevantCount / labeledCandidates;
  // NDCG calculation...
  return { precision, ndcg };
};
```

**Example Code (Backend Calculation):**
```ts
// src/app/api/talent-matching/route.ts
const relevantCandidates = rankedCandidates.filter(c => (c.score || 0) > 0.7).length;
const precision = totalCandidates > 0 ? relevantCandidates / totalCandidates : 0;
// NDCG calculation...
```
---

## How to Run

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Set up your `.env.local` file with your Supabase and Cohere API credentials.  
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   COHERE_API_KEY=your-cohere-api-key
   ```
   Replace the values with your actual project credentials.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the app at [http://localhost:3000](http://localhost:3000)

---

## Acknowledgements

- **Cursor** and **Claude 3.7** for AI-powered code, data, and architecture generation.
- **Cohere** for semantic embeddings.
- **Supabase** for the database manipulation.
- **Next.js** for the web app framework.

---

## Contact

For questions or feedback, please open an issue or contact the project maintainer.